import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import "pixi.js/unsafe-eval";
import * as pixi from "pixi.js";
import type { Application, ColorSource, Container, Graphics } from "pixi.js";
import type { Position } from "@color-game/shared-types";
import {
  PLACEMENT_FX_DURATION_MS,
  SCORE_FX_DURATION_MS,
  resolveBoardFxDesign,
  type PlacementFxDesign,
  type ScoreFxDesign,
} from "./boardFxDesign";

interface TangoBoardFxProps {
  boardRef: RefObject<HTMLElement>;
  lastPlaced: Position | null;
  scoringCells: Set<string>;
  placementPreset?: string | undefined;
  scorePreset?: string | undefined;
  placementColors: readonly string[];
  scoreColors: readonly string[];
  motionStyle?: "legacy" | "refined";
  placementSequenceKey?: string | number;
  scoreSequenceKey?: string | number;
  onReadyChange?: ((ready: boolean) => void) | undefined;
}

interface CellRect {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

type PixiModule = typeof pixi;
type SequenceRef = { current: number };

const FALLBACK_ACCENT = "#e2c49a";
const easeOutCubic = (value: number) => 1 - ((1 - value) ** 3);
const easeInOutCubic = (value: number) => value < 0.5
  ? 4 * value * value * value
  : 1 - ((-2 * value + 2) ** 3) / 2;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const windowProgress = (value: number, start: number, end: number) => clamp01((value - start) / (end - start));
const softPulse = (value: number, start: number, end: number) => Math.sin(windowProgress(value, start, end) * Math.PI);

function safeColor(value: string | undefined): ColorSource {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : FALLBACK_ACCENT;
}

function destroyLayer(layer: Container | null) {
  if (layer === null || layer.destroyed) return;
  layer.removeFromParent();
  layer.destroy({ children: true });
}

function drawDiamond(graphics: Graphics, x: number, y: number, radius: number) {
  return graphics.poly([
    x, y - radius,
    x + radius, y,
    x, y + radius,
    x - radius, y,
  ], true);
}

function drawPetal(pixi: PixiModule, width: number, height: number, color: ColorSource) {
  const petal = new pixi.Container();
  const glow = new pixi.Graphics()
    .ellipse(0, -height * 0.24, width * 0.7, height * 0.46)
    .fill({ color, alpha: 0.14 });
  const body = new pixi.Graphics()
    .moveTo(0, 0)
    .bezierCurveTo(width * 0.58, -height * 0.22, width * 0.45, -height * 0.76, 0, -height)
    .bezierCurveTo(-width * 0.45, -height * 0.76, -width * 0.58, -height * 0.22, 0, 0)
    .fill({ color, alpha: 0.7 })
    .stroke({ color: "#f8f2ff", width: Math.max(0.55, width * 0.035), alpha: 0.42 });
  const vein = new pixi.Graphics()
    .moveTo(0, -height * 0.06)
    .lineTo(0, -height * 0.72)
    .stroke({ color: "#fffdf1", width: Math.max(0.5, width * 0.025), alpha: 0.38 });
  petal.addChild(glow, body, vein);
  return petal;
}

function drawTangoOutlineMark(
  pixi: PixiModule,
  size: number,
  stroke: ColorSource,
  shadow: ColorSource = "#171311",
) {
  const mark = new pixi.Container();
  const scale = size / 92;
  const specs = [
    { x: 21, y: 36, rotation: -9 * Math.PI / 180 },
    { x: 47, y: 28, rotation: -3 * Math.PI / 180 },
    { x: 73, y: 20, rotation: 8 * Math.PI / 180 },
  ] as const;
  specs.forEach(({ x, y, rotation }, index) => {
    const tile = new pixi.Container();
    const tileSize = 32 * scale;
    const darkOutline = new pixi.Graphics()
      .roundRect(-tileSize / 2, -tileSize / 2, tileSize, tileSize, tileSize * 0.26)
      .stroke({ color: shadow, width: Math.max(2.2, size * 0.043), alpha: 0.94 });
    const fineOutline = new pixi.Graphics()
      .roundRect(-tileSize / 2, -tileSize / 2, tileSize, tileSize, tileSize * 0.26)
      .stroke({ color: stroke, width: Math.max(1.15, size * 0.021), alpha: 1 });
    tile.addChild(darkOutline, fineOutline);
    tile.position.set((x - 47) * scale, (y - 29) * scale);
    tile.rotation = rotation;
    tile.zIndex = index;
    mark.addChild(tile);
  });
  const notches = new pixi.Graphics();
  [[34, 32], [61, 24]].forEach(([x, y]) => {
    notches
      .circle((x! - 47) * scale, (y! - 29) * scale, 4.6 * scale)
      .stroke({ color: shadow, width: Math.max(1.8, size * 0.032), alpha: 0.94 })
      .circle((x! - 47) * scale, (y! - 29) * scale, 4.6 * scale)
      .stroke({ color: stroke, width: Math.max(0.9, size * 0.016), alpha: 1 });
  });
  notches.zIndex = 4;
  mark.addChild(notches);
  mark.sortableChildren = true;
  return mark;
}

type PlacementAnimate = (duration: number, update: (progress: number) => void) => Promise<void>;

function scaleAround(graphic: Graphics | Container, rect: CellRect, scale: number) {
  graphic.pivot.set(rect.centerX, rect.centerY);
  graphic.position.set(rect.centerX, rect.centerY);
  graphic.scale.set(scale);
}

function cellMask(pixi: PixiModule, rect: CellRect) {
  const inset = Math.max(2, rect.width * 0.035);
  return new pixi.Graphics()
    .roundRect(
      rect.x + inset,
      rect.y + inset,
      rect.width - inset * 2,
      rect.height - inset * 2,
      Math.max(5, rect.width * 0.12),
    )
    .fill({ color: "#ffffff" });
}

async function renderRefinedPlacement({
  pixi,
  layer,
  rect,
  design,
  primary,
  secondary,
  animate,
}: {
  pixi: PixiModule;
  layer: Container;
  rect: CellRect;
  design: PlacementFxDesign;
  primary: ColorSource;
  secondary: ColorSource;
  animate: PlacementAnimate;
}) {
  const mask = cellMask(pixi, rect);
  const stage = new pixi.Container();
  stage.mask = mask;
  layer.addChild(mask, stage);

  const exitAlpha = (raw: number, start = 0.68) => raw < start
    ? 1
    : 1 - easeInOutCubic((raw - start) / (1 - start));

  if (design === "maple-tap") {
    await animate(PLACEMENT_FX_DURATION_MS[design], () => undefined);
    return;
  }

  if (design === "walnut-shadow") {
    await animate(PLACEMENT_FX_DURATION_MS[design], () => undefined);
    return;
  }

  if (design === "ivory-click") {
    const capSize = rect.width * 0.185;
    const inset = rect.width * 0.105;
    const guide = new pixi.Graphics()
      .roundRect(rect.x + rect.width * 0.13, rect.y + rect.height * 0.13, rect.width * 0.74, rect.height * 0.74, rect.width * 0.13)
      .stroke({ color: "#fff4d7", width: Math.max(0.7, rect.width * 0.012), alpha: 0.34 });
    guide.alpha = 0;
    stage.addChild(guide);
    const corners = [
      { x: rect.x + inset, y: rect.y + inset, sx: 1, sy: 1, dx: -0.2, dy: -0.2, start: 0 },
      { x: rect.x + rect.width - inset, y: rect.y + inset, sx: -1, sy: 1, dx: 0.2, dy: -0.2, start: 0.04 },
      { x: rect.x + inset, y: rect.y + rect.height - inset, sx: 1, sy: -1, dx: -0.2, dy: 0.2, start: 0.08 },
      { x: rect.x + rect.width - inset, y: rect.y + rect.height - inset, sx: -1, sy: -1, dx: 0.2, dy: 0.2, start: 0.12 },
    ].map(({ x, y, sx, sy, dx, dy, start }) => {
      const cap = new pixi.Container();
      const shadow = new pixi.Graphics()
        .moveTo(sx * capSize, 0)
        .lineTo(0, 0)
        .lineTo(0, sy * capSize)
        .stroke({ color: "#171411", width: Math.max(4, rect.width * 0.074), alpha: 0.54 });
      const outline = new pixi.Graphics()
        .moveTo(sx * capSize, 0)
        .lineTo(0, 0)
        .lineTo(0, sy * capSize)
        .stroke({ color: "#665a49", width: Math.max(3.1, rect.width * 0.058), alpha: 0.96 });
      const ivory = new pixi.Graphics()
        .moveTo(sx * capSize, 0)
        .lineTo(0, 0)
        .lineTo(0, sy * capSize)
        .stroke({ color: "#fff5df", width: Math.max(1.7, rect.width * 0.032), alpha: 1 });
      const bevel = new pixi.Graphics()
        .moveTo(sx * capSize * 0.78, sy * rect.height * 0.012)
        .lineTo(sx * rect.width * 0.012, sy * rect.height * 0.012)
        .lineTo(sx * rect.width * 0.012, sy * capSize * 0.78)
        .stroke({ color: "#ffffff", width: Math.max(0.6, rect.width * 0.011), alpha: 0.58 });
      cap.addChild(shadow, outline, ivory, bevel);
      cap.position.set(x + rect.width * dx, y + rect.height * dy);
      cap.alpha = 0;
      stage.addChild(cap);
      return { cap, x, y, dx, dy, start };
    });
    const lock = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, Math.max(2.2, rect.width * 0.044))
      .stroke({ color: "#fff4d7", width: Math.max(0.7, rect.width * 0.012), alpha: 0.9 })
      .circle(rect.centerX, rect.centerY, Math.max(1.2, rect.width * 0.022))
      .fill({ color: "#d7a84f", alpha: 0.95 });
    lock.alpha = 0;
    stage.addChild(lock);
    await animate(PLACEMENT_FX_DURATION_MS[design], (raw) => {
      const exit = exitAlpha(raw, 0.78);
      guide.alpha = softPulse(raw, 0.08, 0.78) * 0.52;
      corners.forEach(({ cap, x, y, dx, dy, start }) => {
        const local = easeOutCubic(Math.max(0, Math.min(1, (raw - start) / 0.42)));
        const click = 1 - softPulse(raw, 0.54, 0.72) * 0.055;
        cap.position.set(x + rect.width * dx * (1 - local), y + rect.height * dy * (1 - local));
        cap.scale.set(click);
        cap.alpha = local * exit;
      });
      lock.alpha = Math.sin(Math.max(0, Math.min(1, (raw - 0.52) / 0.28)) * Math.PI) * exit;
    });
    return;
  }

  if (design === "charcoal-stamp") {
    const logo = drawTangoOutlineMark(pixi, rect.width * 0.78, "#fff4d7", "#171311");
    logo.position.set(rect.centerX, rect.centerY);
    logo.alpha = 0;
    stage.addChild(logo);
    await animate(PLACEMENT_FX_DURATION_MS[design], (raw) => {
      const strike = easeOutCubic(Math.min(1, raw / 0.38));
      const exit = exitAlpha(raw, 0.7);
      logo.position.y = rect.centerY - rect.height * 0.11 * (1 - strike);
      logo.scale.set(1.2 - strike * 0.2, 1.12 - strike * 0.12);
      logo.alpha = strike * exit;
    });
    return;
  }

  if (design === "moss-leaf") {
    const surfaceShade = new pixi.Graphics()
      .roundRect(rect.x, rect.y, rect.width, rect.height, rect.width * 0.18)
      .fill({ color: "#16241a", alpha: 0.13 });
    surfaceShade.alpha = 0;

    const createPatina = (
      centerX: number,
      centerY: number,
      radiusX: number,
      radiusY: number,
      color: ColorSource,
    ) => {
      const patina = new pixi.Container();
      const layers = [
        { scale: 1, alpha: 0.045 },
        { scale: 0.76, alpha: 0.07 },
        { scale: 0.48, alpha: 0.1 },
      ];
      layers.forEach(({ scale, alpha }) => {
        patina.addChild(new pixi.Graphics()
          .ellipse(centerX, centerY, radiusX * scale, radiusY * scale)
          .fill({ color, alpha }));
      });
      patina.pivot.set(centerX, centerY);
      patina.position.set(centerX, centerY);
      patina.alpha = 0;
      return patina;
    };

    const lowerPatina = createPatina(
      rect.x + rect.width * 0.18,
      rect.y + rect.height * 0.82,
      rect.width * 0.72,
      rect.height * 0.52,
      primary,
    );
    const upperPatina = createPatina(
      rect.x + rect.width * 0.86,
      rect.y + rect.height * 0.12,
      rect.width * 0.58,
      rect.height * 0.44,
      secondary,
    );
    const softSheen = new pixi.Graphics()
      .ellipse(rect.centerX, rect.centerY, rect.width * 0.44, rect.height * 0.12)
      .fill({ color: "#e6efd0", alpha: 0.055 });
    softSheen.rotation = -0.32;
    softSheen.alpha = 0;
    stage.addChild(surfaceShade, lowerPatina, upperPatina, softSheen);

    await animate(PLACEMENT_FX_DURATION_MS[design], (raw) => {
      const settle = easeOutCubic(windowProgress(raw, 0.04, 0.5));
      const exit = exitAlpha(raw, 0.74);
      const wash = softPulse(raw, 0.06, 0.72) * exit;
      surfaceShade.alpha = wash * 0.68;
      lowerPatina.alpha = wash;
      upperPatina.alpha = wash * 0.88;
      lowerPatina.position.set(
        rect.x + rect.width * (0.12 + settle * 0.06),
        rect.y + rect.height * (0.88 - settle * 0.06),
      );
      upperPatina.position.set(
        rect.x + rect.width * (0.92 - settle * 0.06),
        rect.y + rect.height * (0.06 + settle * 0.06),
      );
      const patinaScale = 0.92 + settle * 0.08;
      lowerPatina.scale.set(patinaScale);
      upperPatina.scale.set(patinaScale);
      softSheen.alpha = softPulse(raw, 0.18, 0.58) * 0.42 * exit;
      softSheen.position.x = rect.width * 0.08 * (settle - 0.5);
    });
    return;
  }

  if (design === "coastal-ripple") {
    const sheen = new pixi.Graphics()
      .roundRect(rect.x + rect.width * 0.1, rect.y + rect.height * 0.08, rect.width * 0.13, rect.height * 0.84, rect.width * 0.06)
      .fill({ color: "#f1ffff", alpha: 0.2 });
    sheen.rotation = -0.24;
    sheen.pivot.set(rect.centerX, rect.centerY);
    sheen.position.set(rect.centerX - rect.width * 0.45, rect.centerY);
    stage.addChild(sheen);
    await animate(PLACEMENT_FX_DURATION_MS[design], (raw) => {
      const sweep = windowProgress(raw, 0.12, 0.76);
      const exit = exitAlpha(raw, 0.8);
      sheen.alpha = softPulse(raw, 0.08, 0.82) * 0.34 * exit;
      sheen.position.set(rect.centerX - rect.width * 0.52 + rect.width * 1.04 * sweep, rect.centerY);
    });
    return;
  }

  if (design === "brass-ring") {
    const ringSpecs = [
      { width: 0.36, height: 0.16, rotation: -0.55, direction: 1, color: primary },
      { width: 0.18, height: 0.38, rotation: 0.34, direction: -1, color: secondary },
      { width: 0.34, height: 0.2, rotation: 1.02, direction: 1, color: "#d9aa50" as ColorSource },
    ];
    const rings = ringSpecs.map((spec) => {
      const ring = new pixi.Container();
      const shadow = new pixi.Graphics()
        .ellipse(0, rect.height * 0.012, rect.width * spec.width, rect.height * spec.height)
        .stroke({ color: "#21160d", width: Math.max(2.8, rect.width * 0.043), alpha: 0.64 });
      const body = new pixi.Graphics()
        .ellipse(0, 0, rect.width * spec.width, rect.height * spec.height)
        .stroke({ color: spec.color, width: Math.max(1.65, rect.width * 0.026), alpha: 0.96 });
      const highlight = new pixi.Graphics()
        .arc(0, 0, rect.width * spec.width, -2.72, -0.34)
        .stroke({ color: "#fff0bd", width: Math.max(0.6, rect.width * 0.009), alpha: 0.82 });
      const nodes = [0, Math.PI].map((angle) => new pixi.Graphics()
        .circle(Math.cos(angle) * rect.width * spec.width, Math.sin(angle) * rect.height * spec.height, Math.max(1.25, rect.width * 0.018))
        .stroke({ color: "#3a2613", width: Math.max(0.65, rect.width * 0.009), alpha: 0.88 })
        .fill({ color: "#ffe2a0", alpha: 0.96 }));
      ring.addChild(shadow, body, highlight, ...nodes);
      ring.position.set(rect.centerX, rect.centerY);
      ring.rotation = spec.rotation;
      ring.alpha = 0;
      stage.addChild(ring);
      return { ring, ...spec };
    });
    const cageHalo = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, rect.width * 0.32)
      .stroke({ color: "#d9aa50", width: Math.max(0.55, rect.width * 0.009), alpha: 0.28 });
    const coreShadow = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY + rect.height * 0.015, rect.width * 0.1)
      .fill({ color: "#1b120b", alpha: 0.58 });
    const core = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, rect.width * 0.082)
      .stroke({ color: "#5f3918", width: Math.max(1.5, rect.width * 0.023), alpha: 0.96 })
      .fill({ color: "#d9aa50", alpha: 0.9 })
      .circle(rect.centerX, rect.centerY, rect.width * 0.035)
      .fill({ color: "#fff2bd", alpha: 0.96 });
    const coreLens = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, rect.width * 0.13)
      .stroke({ color: "#fff0bd", width: Math.max(0.65, rect.width * 0.01), alpha: 0.32 })
      .circle(rect.centerX, rect.centerY, rect.width * 0.18)
      .stroke({ color: "#d9aa50", width: Math.max(0.5, rect.width * 0.008), alpha: 0.2 });
    const lockGlint = drawDiamond(new pixi.Graphics(), rect.centerX, rect.centerY, rect.width * 0.055)
      .fill({ color: "#fff8d8", alpha: 0.92 });
    cageHalo.alpha = 0;
    coreShadow.alpha = 0;
    core.alpha = 0;
    coreLens.alpha = 0;
    lockGlint.alpha = 0;
    stage.addChild(cageHalo, coreLens, coreShadow, core, lockGlint);
    await animate(PLACEMENT_FX_DURATION_MS[design], (raw) => {
      const assemble = easeOutCubic(windowProgress(raw, 0.04, 0.34));
      const lock = easeInOutCubic(windowProgress(raw, 0.5, 0.78));
      const exit = exitAlpha(raw, 0.84);
      rings.forEach(({ ring, rotation, direction }, index) => {
        const stagger = easeOutCubic(windowProgress(raw, 0.02 + index * 0.035, 0.34 + index * 0.035));
        ring.alpha = stagger * exit;
        ring.scale.set(0.7 + stagger * 0.3);
        ring.rotation = rotation + direction * (1.55 * (1 - lock) + raw * 1.55);
      });
      cageHalo.alpha = assemble * exit * 0.55;
      scaleAround(cageHalo, rect, 0.72 + assemble * 0.28);
      coreShadow.alpha = lock * exit * 0.72;
      coreLens.alpha = lock * exit;
      scaleAround(coreLens, rect, 0.76 + lock * 0.24);
      core.alpha = lock * exit;
      scaleAround(coreShadow, rect, 0.7 + lock * 0.3);
      scaleAround(core, rect, 0.68 + lock * 0.32);
      lockGlint.alpha = softPulse(raw, 0.66, 0.86) * exit;
    });
    return;
  }

  if (design === "moonlight-bloom") {
    const outerGlow = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, rect.width * 0.41)
      .fill({ color: secondary, alpha: 0.1 });
    const glow = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, rect.width * 0.34)
      .stroke({ color: "#e9e5ff", width: Math.max(0.8, rect.width * 0.013), alpha: 0.62 });
    const petals = Array.from({ length: 8 }, (_, index) => index * Math.PI / 4).map((angle) => {
      const petal = drawPetal(pixi, rect.width * 0.14, rect.height * 0.26, primary);
      petal.position.set(rect.centerX, rect.centerY);
      petal.rotation = angle;
      petal.scale.set(0.12);
      petal.alpha = 0;
      stage.addChild(petal);
      return { petal, baseAngle: angle };
    });
    const coreGlow = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, rect.width * 0.16)
      .fill({ color: "#ddd8ff", alpha: 0.24 });
    const moon = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, rect.width * 0.062)
      .stroke({ color: "#ffffff", width: Math.max(0.65, rect.width * 0.011), alpha: 0.82 })
      .circle(rect.centerX, rect.centerY, rect.width * 0.047)
      .fill({ color: "#fff9dc", alpha: 0.98 });
    stage.addChild(outerGlow, glow, coreGlow, moon);
    await animate(PLACEMENT_FX_DURATION_MS[design], (raw) => {
      const reveal = easeInOutCubic(Math.min(1, raw / 0.62));
      const exit = exitAlpha(raw, 0.8);
      outerGlow.alpha = reveal * exit * 0.3;
      scaleAround(outerGlow, rect, 0.64 + reveal * 0.36);
      glow.alpha = reveal * exit * 0.7;
      scaleAround(glow, rect, 0.72 + reveal * 0.28);
      coreGlow.alpha = reveal * exit * 0.76;
      scaleAround(coreGlow, rect, 0.5 + reveal * 0.5);
      petals.forEach(({ petal, baseAngle }, index) => {
        const pairDelay = Math.floor(index / 2) * 0.055;
        const local = easeOutCubic(Math.max(0, Math.min(1, (raw - 0.12 - pairDelay) / 0.42)));
        petal.alpha = local * exit * 0.92;
        petal.scale.set(0.12 + local * 0.88);
        petal.rotation = baseAngle;
      });
      moon.alpha = easeOutCubic(windowProgress(raw, 0, 0.3)) * exit;
      scaleAround(moon, rect, 0.68 + reveal * 0.32);
    });
    return;
  }

  if (design === "ember-seal") {
    const sparkSpecs = [
      { offset: -0.2, drift: -0.06, rise: 0.3, delay: 0.02, depth: 0.7 },
      { offset: -0.12, drift: 0.035, rise: 0.38, delay: 0.07, depth: 1 },
      { offset: -0.04, drift: -0.018, rise: 0.26, delay: 0.13, depth: 0.58 },
      { offset: 0.055, drift: 0.052, rise: 0.36, delay: 0.04, depth: 0.88 },
      { offset: 0.14, drift: -0.032, rise: 0.31, delay: 0.11, depth: 0.74 },
      { offset: 0.21, drift: 0.058, rise: 0.24, delay: 0.17, depth: 0.52 },
      { offset: 0.01, drift: 0.025, rise: 0.44, delay: 0.2, depth: 0.92 },
    ] as const;
    const sparks = sparkSpecs.map((spec, index) => {
      const spark = new pixi.Container();
      const trail = new pixi.Graphics()
        .moveTo(0, rect.height * 0.055)
        .bezierCurveTo(
          -rect.width * spec.drift * 0.35,
          rect.height * 0.02,
          rect.width * spec.drift * 0.25,
          -rect.height * 0.015,
          0,
          -rect.height * 0.045,
        )
        .stroke({ color: index % 3 === 0 ? "#ff6b2f" : "#ffb24f", width: Math.max(0.65, rect.width * 0.009), alpha: 0.44 });
      const glow = new pixi.Graphics()
        .ellipse(0, 0, Math.max(1.8, rect.width * 0.027), Math.max(1.2, rect.height * 0.017))
        .fill({ color: index % 2 === 0 ? "#ff6b2f" : "#ffc15a", alpha: 0.2 });
      const core = new pixi.Graphics()
        .ellipse(0, 0, Math.max(0.75, rect.width * 0.009), Math.max(1.1, rect.height * 0.014))
        .fill({ color: index % 2 === 0 ? "#ff7a35" : "#ffd477", alpha: 0.98 })
        .circle(-rect.width * 0.0015, -rect.height * 0.004, Math.max(0.34, rect.width * 0.0038))
        .fill({ color: "#fff4ca", alpha: 0.96 });
      spark.addChild(trail, glow, core);
      spark.position.set(rect.centerX + rect.width * spec.offset, rect.y + rect.height * 0.76);
      spark.alpha = 0;
      stage.addChild(spark);
      return { spark, ...spec };
    });
    await animate(PLACEMENT_FX_DURATION_MS[design], (raw) => {
      const exit = exitAlpha(raw, 0.9);
      sparks.forEach(({ spark, offset, delay, drift, rise, depth }, index) => {
        const local = windowProgress(raw, 0.05 + delay, 0.62 + delay);
        const pulse = Math.sin(local * Math.PI);
        const lift = easeOutCubic(local);
        spark.alpha = pulse * exit * (0.74 + depth * 0.26);
        spark.x = rect.centerX + rect.width * (offset + drift * lift + Math.sin(local * Math.PI * 1.35 + index * 0.8) * 0.012);
        spark.y = rect.y + rect.height * (0.76 - lift * rise);
        spark.rotation = (index % 2 === 0 ? -1 : 1) * (0.2 + lift * 0.42);
        const depthScale = 0.32 + pulse * (0.42 + depth * 0.34);
        spark.scale.set(depthScale, depthScale * (0.78 + depth * 0.24));
      });
    });
    return;
  }

  if (design === "prism-fold") {
    const aperture = new pixi.Container();
    aperture.position.set(rect.centerX, rect.centerY);
    aperture.alpha = 0;
    stage.addChild(aperture);
    const depthPlate = drawDiamond(new pixi.Graphics(), 0, rect.height * 0.018, rect.width * 0.185)
      .fill({ color: "#12131b", alpha: 0.46 })
      .stroke({ color: "#ffffff", width: Math.max(1, rect.width * 0.014), alpha: 0.16 });
    const facetColors = ["#de5877", "#e1a04b", "#55b7a1", "#4aa0c9", "#6571dc", "#ad63d2"] as const;
    const facets = facetColors.map((color, index) => {
      const angle = -Math.PI / 2 + index * Math.PI / 3;
      const facetContainer = new pixi.Container();
      const shadow = new pixi.Graphics()
        .poly([
          0, -rect.height * 0.015,
          rect.width * 0.325, -rect.height * 0.105,
          rect.width * 0.305, rect.height * 0.105,
          0, rect.height * 0.015,
        ], true)
        .fill({ color: "#11131d", alpha: 0.36 });
      const facet = new pixi.Graphics()
        .poly([
          0, -rect.height * 0.02,
          rect.width * 0.31, -rect.height * 0.09,
          rect.width * 0.285, rect.height * 0.09,
          0, rect.height * 0.02,
        ], true)
        .fill({ color, alpha: 0.46 })
        .stroke({ color: "#fffbed", width: Math.max(0.5, rect.width * 0.0075), alpha: 0.46 });
      const innerRefraction = new pixi.Graphics()
        .moveTo(rect.width * 0.04, 0)
        .lineTo(rect.width * 0.25, -rect.height * 0.058)
        .stroke({ color: "#ffffff", width: Math.max(0.45, rect.width * 0.0065), alpha: 0.32 });
      facetContainer.addChild(shadow, facet, innerRefraction);
      facetContainer.rotation = angle;
      facetContainer.scale.x = 0.03;
      aperture.addChild(facetContainer);
      return { facet: facetContainer, angle };
    });
    const chromaticCore = new pixi.Container();
    const coreShadow = drawDiamond(new pixi.Graphics(), 0, rect.height * 0.014, rect.width * 0.13)
      .fill({ color: "#12131b", alpha: 0.58 });
    const redEdge = drawDiamond(new pixi.Graphics(), -rect.width * 0.012, 0, rect.width * 0.116)
      .stroke({ color: "#de5877", width: Math.max(1.2, rect.width * 0.018), alpha: 0.62 });
    const blueEdge = drawDiamond(new pixi.Graphics(), rect.width * 0.012, 0, rect.width * 0.116)
      .stroke({ color: "#6571dc", width: Math.max(1.2, rect.width * 0.018), alpha: 0.62 });
    const core = drawDiamond(new pixi.Graphics(), 0, 0, rect.width * 0.108)
      .fill({ color: "#f8f5ff", alpha: 0.23 })
      .stroke({ color: "#fffdf4", width: Math.max(0.9, rect.width * 0.013), alpha: 0.9 });
    const coreLens = drawDiamond(new pixi.Graphics(), 0, 0, rect.width * 0.052)
      .fill({ color: "#ffffff", alpha: 0.55 });
    chromaticCore.addChild(coreShadow, redEdge, blueEdge, core, coreLens);
    chromaticCore.alpha = 0;
    chromaticCore.scale.set(0.55);
    aperture.addChild(depthPlate, chromaticCore);
    const caustics = [-0.72, 0, 0.72].map((angle, index) => {
      const ray = new pixi.Graphics()
        .moveTo(rect.centerX + Math.cos(angle) * rect.width * 0.16, rect.centerY + Math.sin(angle) * rect.height * 0.16)
        .lineTo(rect.centerX + Math.cos(angle) * rect.width * (0.31 + index * 0.025), rect.centerY + Math.sin(angle) * rect.height * (0.31 + index * 0.025))
        .stroke({ color: facetColors[index * 2] ?? primary, width: Math.max(0.65, rect.width * 0.009), alpha: 0.38 });
      ray.alpha = 0;
      stage.addChild(ray);
      return ray;
    });
    const spectralEdge = new pixi.Graphics()
      .roundRect(rect.x + rect.width * 0.09, rect.y + rect.height * 0.09, rect.width * 0.82, rect.height * 0.82, rect.width * 0.18)
      .stroke({ color: primary, width: Math.max(2.4, rect.width * 0.038), alpha: 0.22 })
      .roundRect(rect.x + rect.width * 0.115, rect.y + rect.height * 0.115, rect.width * 0.77, rect.height * 0.77, rect.width * 0.16)
      .stroke({ color: secondary, width: Math.max(1.1, rect.width * 0.017), alpha: 0.3 });
    const sheen = new pixi.Graphics()
      .poly([
        rect.x + rect.width * 0.06, rect.y + rect.height * 0.86,
        rect.x + rect.width * 0.19, rect.y + rect.height * 0.92,
        rect.x + rect.width * 0.94, rect.y + rect.height * 0.14,
        rect.x + rect.width * 0.82, rect.y + rect.height * 0.08,
      ], true)
      .fill({ color: "#ffffff", alpha: 0.16 });
    spectralEdge.alpha = 0;
    sheen.alpha = 0;
    stage.addChild(spectralEdge, sheen);
    await animate(PLACEMENT_FX_DURATION_MS[design], (raw) => {
      const open = easeInOutCubic(windowProgress(raw, 0.04, 0.62));
      const lock = easeOutCubic(windowProgress(raw, 0.48, 0.76));
      const exit = exitAlpha(raw, 0.88);
      aperture.alpha = open * exit;
      aperture.rotation = -0.28 * (1 - open);
      depthPlate.alpha = open * exit * 0.74;
      depthPlate.scale.set(0.72 + open * 0.28);
      facets.forEach(({ facet, angle }, index) => {
        const local = easeOutCubic(windowProgress(raw, 0.04 + index * 0.026, 0.49 + index * 0.026));
        facet.scale.x = 0.03 + local * 0.97;
        facet.scale.y = 0.82 + local * 0.18;
        facet.rotation = angle - (1 - local) * 0.36;
        facet.alpha = (0.2 + local * 0.8) * exit;
      });
      chromaticCore.alpha = lock * exit;
      chromaticCore.scale.set(0.55 + lock * 0.45);
      chromaticCore.rotation = (1 - lock) * -0.42;
      caustics.forEach((ray, index) => {
        ray.alpha = softPulse(raw, 0.5 + index * 0.025, 0.82 + index * 0.018) * exit * 0.72;
      });
      spectralEdge.alpha = softPulse(raw, 0.34, 0.88) * exit * 0.92;
      sheen.alpha = softPulse(raw, 0.57, 0.9) * exit * 0.92;
      sheen.position.x = rect.width * windowProgress(raw, 0.57, 0.9) * 0.24;
    });
    return;
  }

  if (design === "cosmos-orbit") {
    const wash = new pixi.Graphics().circle(rect.centerX, rect.centerY, rect.width * 0.43).fill({ color: secondary, alpha: 0.14 });
    const innerWash = new pixi.Graphics().circle(rect.centerX, rect.centerY, rect.width * 0.23).fill({ color: primary, alpha: 0.2 });
    const orbit = new pixi.Graphics().ellipse(rect.centerX, rect.centerY, rect.width * 0.4, rect.height * 0.22).stroke({ color: primary, width: 1.15, alpha: 0.78 });
    const counterOrbit = new pixi.Graphics().ellipse(rect.centerX, rect.centerY, rect.width * 0.24, rect.height * 0.38).stroke({ color: secondary, width: 0.85, alpha: 0.54 });
    orbit.pivot.set(rect.centerX, rect.centerY); orbit.position.set(rect.centerX, rect.centerY);
    counterOrbit.pivot.set(rect.centerX, rect.centerY); counterOrbit.position.set(rect.centerX, rect.centerY);
    const core = new pixi.Graphics().circle(rect.centerX, rect.centerY, Math.max(2.4, rect.width * 0.052)).fill({ color: "#f4f0ff", alpha: 0.88 });
    const starOffsets = [[-0.27, -0.16], [0.28, 0.14], [0.12, -0.3], [-0.12, 0.3]] as const;
    const stars = starOffsets.map(([x, y], index) => {
      const star = drawDiamond(new pixi.Graphics(), rect.centerX + rect.width * x, rect.centerY + rect.height * y, Math.max(1.25, rect.width * 0.02))
        .fill({ color: index % 2 === 0 ? primary : secondary, alpha: 0.9 });
      stage.addChild(star);
      return star;
    });
    stage.addChild(wash, innerWash, orbit, counterOrbit, core);
    await animate(PLACEMENT_FX_DURATION_MS[design], (raw) => {
      const settle = easeOutCubic(Math.min(1, raw / 0.3));
      const reveal = easeInOutCubic(Math.max(0, Math.min(1, (raw - 0.08) / 0.46)));
      const exit = exitAlpha(raw, 0.7);
      wash.alpha = 0.52 * settle * exit;
      innerWash.alpha = 0.66 * settle * exit;
      orbit.alpha = reveal * exit;
      counterOrbit.alpha = reveal * 0.78 * exit;
      orbit.rotation = -0.18 + raw * 0.28;
      counterOrbit.rotation = -0.48 - raw * 0.22;
      core.alpha = settle * exit;
      stars.forEach((star, index) => { star.alpha = easeOutCubic(Math.max(0, Math.min(1, (raw - 0.2 - index * 0.035) / 0.3))) * exit; });
    });
    return;
  }

  if (design === "tango-trinity") {
    const colors = ["#b64f69", "#405f8e", "#3f806e"] as const;
    const orbitHalo = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, rect.width * 0.37)
      .stroke({ color: "#f0d090", width: Math.max(0.65, rect.width * 0.01), alpha: 0.32 })
      .circle(rect.centerX, rect.centerY, rect.width * 0.26)
      .stroke({ color: "#fff6df", width: Math.max(0.45, rect.width * 0.007), alpha: 0.18 });
    orbitHalo.alpha = 0;
    stage.addChild(orbitHalo);
    const resonance = ["#b64f69", "#405f8e", "#3f806e"].map((color, index) => {
      const wave = new pixi.Graphics()
        .circle(rect.centerX, rect.centerY, rect.width * (0.2 + index * 0.035))
        .stroke({ color, width: Math.max(1.1, rect.width * 0.017), alpha: 0.7 });
      wave.alpha = 0;
      stage.addChild(wave);
      return wave;
    });
    const finalSpecs = [
      { x: -0.18, y: 0.095, rotation: -0.16 },
      { x: 0, y: 0, rotation: -0.05 },
      { x: 0.18, y: -0.095, rotation: 0.14 },
    ] as const;
    const marks = finalSpecs.map((spec, index) => {
      const mark = new pixi.Container();
      const size = rect.width * 0.235;
      const glow = new pixi.Graphics()
        .roundRect(-size * 0.56, -size * 0.56, size * 1.12, size * 1.12, size * 0.31)
        .fill({ color: colors[index]!, alpha: 0.14 });
      const shadow = new pixi.Graphics()
        .roundRect(-size / 2, -size / 2 + rect.height * 0.012, size, size, size * 0.26)
        .fill({ color: "#13110f", alpha: 0.45 });
      const body = new pixi.Graphics()
        .roundRect(-size / 2, -size / 2, size, size, size * 0.26)
        .stroke({ color: "#fff3d7", width: Math.max(0.75, rect.width * 0.012), alpha: 0.68 })
        .fill({ color: colors[index]!, alpha: 0.92 });
      const notch = new pixi.Graphics()
        .circle(size * 0.21, -size * 0.05, size * 0.085)
        .fill({ color: "#fff8e7", alpha: 0.96 });
      mark.addChild(glow, shadow, body, notch);
      mark.alpha = 0;
      stage.addChild(mark);
      return { mark, spec, phase: -Math.PI / 2 + index * Math.PI * 2 / 3 };
    });
    const finalOutline = drawTangoOutlineMark(pixi, rect.width * 0.55, "#fff3d7", "#2a1b13");
    finalOutline.position.set(rect.centerX, rect.centerY);
    finalOutline.alpha = 0;
    const crown = new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, rect.width * 0.29)
      .stroke({ color: "#d9aa50", width: Math.max(1.2, rect.width * 0.018), alpha: 0.76 });
    const burst = Array.from({ length: 6 }, (_, index) => {
      const ray = new pixi.Graphics()
        .moveTo(rect.centerX + rect.width * 0.32, rect.centerY)
        .lineTo(rect.centerX + rect.width * 0.42, rect.centerY)
        .stroke({ color: index % 2 === 0 ? "#fff4ce" : colors[index % 3]!, width: Math.max(0.7, rect.width * 0.011), alpha: 0.76 });
      ray.pivot.set(rect.centerX, rect.centerY);
      ray.position.set(rect.centerX, rect.centerY);
      ray.rotation = index * Math.PI / 3;
      ray.alpha = 0;
      stage.addChild(ray);
      return ray;
    });
    crown.alpha = 0;
    stage.addChild(crown, finalOutline);
    await animate(PLACEMENT_FX_DURATION_MS[design], (raw) => {
      const orbitIn = easeOutCubic(windowProgress(raw, 0.02, 0.25));
      const gather = easeInOutCubic(windowProgress(raw, 0.42, 0.76));
      const resolve = easeOutCubic(windowProgress(raw, 0.67, 0.84));
      const exit = exitAlpha(raw, 0.9);
      orbitHalo.alpha = orbitIn * (1 - gather * 0.65) * exit;
      scaleAround(orbitHalo, rect, 0.72 + orbitIn * 0.28);
      marks.forEach(({ mark, spec, phase }, index) => {
        const angle = phase + raw * Math.PI * 2.15;
        const orbitX = Math.cos(angle) * rect.width * 0.3;
        const orbitY = Math.sin(angle) * rect.height * 0.19;
        const targetX = rect.width * spec.x;
        const targetY = rect.height * spec.y;
        mark.position.set(
          rect.centerX + orbitX * (1 - gather) + targetX * gather,
          rect.centerY + orbitY * (1 - gather) + targetY * gather,
        );
        mark.rotation = angle * 0.32 * (1 - gather) + spec.rotation * gather;
        mark.scale.set(0.68 + orbitIn * 0.2 + gather * 0.12);
        mark.alpha = orbitIn * exit;
        if (index === 1) mark.zIndex = 2;
      });
      stage.sortableChildren = true;
      finalOutline.alpha = resolve * exit * 0.92;
      scaleAround(finalOutline, rect, 0.84 + resolve * 0.16);
      crown.alpha = softPulse(raw, 0.66, 0.9) * exit;
      scaleAround(crown, rect, 0.68 + resolve * 0.32);
      resonance.forEach((wave, index) => {
        const local = softPulse(raw, 0.68 + index * 0.025, 0.94 + index * 0.01);
        wave.alpha = local * exit * (0.74 - index * 0.12);
        scaleAround(wave, rect, 0.58 + local * (0.42 + index * 0.08));
      });
      burst.forEach((ray, index) => {
        const local = softPulse(raw, 0.7 + index * 0.008, 0.94);
        ray.alpha = local * exit * 0.8;
        ray.scale.set(0.72 + local * 0.28);
      });
    });
    return;
  }

  const outline = new pixi.Graphics()
    .roundRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, rect.width * 0.1)
    .stroke({ color: primary, width: 1.05, alpha: 0.7 });
  stage.addChild(outline);
  await animate(280, (raw) => { outline.alpha = Math.sin(raw * Math.PI) * 0.72; });
}

type ScoreAnimate = (duration: number, update: (progress: number) => void) => Promise<void>;

function orderScoreRects(rects: CellRect[]) {
  if (rects.length < 2) return rects;
  const minX = Math.min(...rects.map((rect) => rect.centerX));
  const maxX = Math.max(...rects.map((rect) => rect.centerX));
  const minY = Math.min(...rects.map((rect) => rect.centerY));
  const maxY = Math.max(...rects.map((rect) => rect.centerY));
  return [...rects].sort((a, b) => (maxX - minX >= maxY - minY)
    ? a.centerX - b.centerX || a.centerY - b.centerY
    : a.centerY - b.centerY || a.centerX - b.centerX);
}

function connectionPath(pixi: PixiModule, rects: CellRect[], color: ColorSource, width: number, alpha: number) {
  const path = new pixi.Graphics();
  rects.forEach((rect, index) => {
    if (index === 0) path.moveTo(rect.centerX, rect.centerY);
    else path.lineTo(rect.centerX, rect.centerY);
  });
  path.stroke({ color, width, alpha });
  return path;
}

async function renderRefinedScore({
  pixi,
  layer,
  rects,
  design,
  primary,
  secondary,
  tertiary,
  animate,
}: {
  pixi: PixiModule;
  layer: Container;
  rects: CellRect[];
  design: ScoreFxDesign;
  primary: ColorSource;
  secondary: ColorSource;
  tertiary: ColorSource;
  animate: ScoreAnimate;
}) {
  const ordered = orderScoreRects(rects);
  const cellSize = Math.min(ordered[0]!.width, ordered[0]!.height);
  const centroid = ordered.reduce((point, rect) => ({
    x: point.x + rect.centerX / ordered.length,
    y: point.y + rect.centerY / ordered.length,
  }), { x: 0, y: 0 });
  const duration = SCORE_FX_DURATION_MS[design];
  const fadeOut = (raw: number, start = 0.7) => raw < start
    ? 1
    : 1 - easeInOutCubic((raw - start) / (1 - start));
  const makeCellPanel = (rect: CellRect, color: ColorSource, fillAlpha = 0.1) => new pixi.Graphics()
    .roundRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, rect.width * 0.11)
    .fill({ color, alpha: fillAlpha })
    .stroke({ color, width: Math.max(1, cellSize * 0.018), alpha: 0.72 });

  if (design === "maple-fade" || design === "trace") {
    const path = connectionPath(pixi, ordered, primary, Math.max(1, cellSize * 0.018), 0.54);
    const panels = ordered.map((rect) => {
      const panel = makeCellPanel(rect, primary, 0.1);
      layer.addChild(panel);
      return { panel, rect };
    });
    layer.addChildAt(path, 0);
    await animate(duration, (raw) => {
      const exit = fadeOut(raw, 0.62);
      path.alpha = softPulse(raw, 0, 0.72) * 0.74;
      panels.forEach(({ panel, rect }, index) => {
        const local = easeOutCubic(windowProgress(raw, index * 0.045, 0.5 + index * 0.025));
        const gather = easeInOutCubic(windowProgress(raw, 0.38, 0.9));
        panel.alpha = local * exit;
        panel.position.set(0, -cellSize * 0.08 * gather);
        scaleAround(panel, rect, 1 - gather * 0.18);
      });
    });
    return;
  }

  if (design === "walnut-sweep") {
    const path = connectionPath(pixi, ordered, primary, Math.max(2, cellSize * 0.055), 0.18);
    const panels = ordered.map((rect, index) => {
      const panel = makeCellPanel(rect, index % 2 === 0 ? primary : secondary, 0.085);
      panel.alpha = 0;
      layer.addChild(panel);
      return { panel, rect };
    });
    const head = new pixi.Graphics()
      .roundRect(-cellSize * 0.08, -cellSize * 0.36, cellSize * 0.16, cellSize * 0.72, cellSize * 0.08)
      .fill({ color: secondary, alpha: 0.82 });
    layer.addChildAt(path, 0);
    layer.addChild(head);
    await animate(duration, (raw) => {
      const travel = easeInOutCubic(windowProgress(raw, 0.04, 0.72));
      const segment = travel * Math.max(1, ordered.length - 1);
      const left = Math.min(ordered.length - 1, Math.floor(segment));
      const right = Math.min(ordered.length - 1, left + 1);
      const ratio = segment - left;
      head.position.set(
        ordered[left]!.centerX + (ordered[right]!.centerX - ordered[left]!.centerX) * ratio,
        ordered[left]!.centerY + (ordered[right]!.centerY - ordered[left]!.centerY) * ratio,
      );
      head.alpha = fadeOut(raw, 0.72);
      panels.forEach(({ panel, rect }, index) => {
        const local = easeOutCubic(windowProgress(raw, 0.08 + index * 0.075, 0.42 + index * 0.075));
        panel.alpha = local * fadeOut(raw, 0.7);
        panel.skew.x = (1 - local) * 0.12;
        scaleAround(panel, rect, 0.94 + local * 0.06);
      });
    });
    return;
  }

  if (design === "ivory-lift") {
    const panels = ordered.map((rect, index) => {
      const glow = new pixi.Graphics()
        .roundRect(rect.x + 5, rect.y + 7, rect.width - 10, rect.height - 10, rect.width * 0.1)
        .fill({ color: index % 2 === 0 ? primary : secondary, alpha: 0.15 });
      const glint = new pixi.Graphics()
        .moveTo(rect.centerX, rect.y + rect.height * 0.78)
        .lineTo(rect.centerX, rect.y + rect.height * 0.2)
        .stroke({ color: "#fffaf0", width: Math.max(1.2, cellSize * 0.025), alpha: 0.78 });
      const cell = new pixi.Container();
      cell.addChild(glow, glint);
      layer.addChild(cell);
      return { cell, glint, rect, index };
    });
    await animate(duration, (raw) => {
      const exit = fadeOut(raw, 0.72);
      panels.forEach(({ cell, glint, rect, index }) => {
        const local = easeOutCubic(windowProgress(raw, index * 0.055, 0.48 + index * 0.04));
        cell.alpha = local * exit;
        cell.position.y = -cellSize * 0.16 * local;
        scaleAround(cell, rect, 0.94 + local * 0.06);
        glint.alpha = softPulse(raw, 0.24 + index * 0.035, 0.7 + index * 0.02) * exit;
      });
    });
    return;
  }

  if (design === "charcoal-dust") {
    const path = connectionPath(pixi, ordered, primary, Math.max(1, cellSize * 0.02), 0.5);
    const dust = ordered.flatMap((rect, cellIndex) => Array.from({ length: 5 }, (_, index) => {
      const particle = new pixi.Graphics()
        .circle(0, 0, Math.max(1, cellSize * (0.018 + (index % 2) * 0.006)))
        .fill({ color: index % 3 === 0 ? secondary : primary, alpha: 0.8 });
      const startX = rect.centerX + ((index % 3) - 1) * cellSize * 0.17;
      const startY = rect.centerY + (Math.floor(index / 3) - 0.5) * cellSize * 0.18;
      particle.position.set(startX, startY);
      particle.alpha = 0;
      layer.addChild(particle);
      return { particle, startX, startY, index: cellIndex * 5 + index };
    }));
    layer.addChildAt(path, 0);
    await animate(duration, (raw) => {
      path.alpha = softPulse(raw, 0, 0.58) * 0.58;
      dust.forEach(({ particle, startX, startY, index }) => {
        const local = windowProgress(raw, 0.18 + (index % 5) * 0.025, 0.9);
        particle.alpha = Math.sin(local * Math.PI) * 0.78;
        particle.position.set(
          startX + (centroid.x - startX) * local * 0.16 + Math.sin(index * 2.3) * cellSize * 0.08 * local,
          startY - cellSize * (0.18 + (index % 4) * 0.055) * local,
        );
      });
    });
    return;
  }

  if (design === "forest-scatter") {
    const vine = connectionPath(pixi, ordered, primary, Math.max(1.4, cellSize * 0.025), 0.68);
    const leaves = ordered.flatMap((rect, cellIndex) => [-1, 1].map((side, index) => {
      const leaf = new pixi.Graphics()
        .ellipse(0, 0, cellSize * 0.11, cellSize * 0.055)
        .fill({ color: index === 0 ? primary : secondary, alpha: 0.74 });
      leaf.position.set(rect.centerX + side * cellSize * 0.16, rect.centerY - side * cellSize * 0.08);
      leaf.rotation = side * 0.58;
      leaf.alpha = 0;
      layer.addChild(leaf);
      return { leaf, cellIndex, side };
    }));
    layer.addChildAt(vine, 0);
    await animate(duration, (raw) => {
      vine.alpha = softPulse(raw, 0, 0.82) * 0.78;
      leaves.forEach(({ leaf, cellIndex, side }) => {
        const local = windowProgress(raw, 0.12 + cellIndex * 0.045, 0.72 + cellIndex * 0.02);
        leaf.alpha = Math.sin(local * Math.PI) * 0.84;
        leaf.rotation = side * (0.58 + local * 0.32);
        leaf.scale.set(0.55 + easeOutCubic(local) * 0.45);
      });
    });
    return;
  }

  if (design === "coastal-wash") {
    const panels = ordered.map((rect) => {
      const panel = makeCellPanel(rect, primary, 0.12);
      layer.addChild(panel);
      return { panel, rect };
    });
    const start = ordered[0]!;
    const end = ordered.at(-1)!;
    const wave = new pixi.Graphics()
      .ellipse(0, 0, cellSize * 0.4, cellSize * 0.78)
      .fill({ color: secondary, alpha: 0.24 })
      .stroke({ color: "#e8ffff", width: Math.max(1, cellSize * 0.018), alpha: 0.7 });
    wave.rotation = Math.atan2(end.centerY - start.centerY, end.centerX - start.centerX);
    layer.addChild(wave);
    await animate(duration, (raw) => {
      const travel = easeInOutCubic(windowProgress(raw, 0.04, 0.78));
      wave.position.set(
        start.centerX + (end.centerX - start.centerX) * travel,
        start.centerY + (end.centerY - start.centerY) * travel,
      );
      wave.alpha = fadeOut(raw, 0.8);
      panels.forEach(({ panel, rect }, index) => {
        const local = windowProgress(raw, 0.12 + index * 0.055, 0.72 + index * 0.025);
        panel.alpha = Math.sin(local * Math.PI) * 0.72;
        panel.skew.x = Math.sin(local * Math.PI * 2) * 0.035;
        scaleAround(panel, rect, 1 + Math.sin(local * Math.PI) * 0.035);
      });
    });
    return;
  }

  if (design === "brass-glint") {
    const path = connectionPath(pixi, ordered, primary, Math.max(1.4, cellSize * 0.024), 0.52);
    const nodes = ordered.map((rect) => new pixi.Graphics()
      .circle(rect.centerX, rect.centerY, cellSize * 0.09)
      .stroke({ color: secondary, width: Math.max(1.2, cellSize * 0.022), alpha: 0.78 }));
    const glint = drawDiamond(new pixi.Graphics(), 0, 0, cellSize * 0.09)
      .fill({ color: "#fff2bc", alpha: 0.94 });
    layer.addChild(path, ...nodes, glint);
    await animate(duration, (raw) => {
      const travel = easeInOutCubic(windowProgress(raw, 0.08, 0.74));
      const segment = travel * Math.max(1, ordered.length - 1);
      const left = Math.min(ordered.length - 1, Math.floor(segment));
      const right = Math.min(ordered.length - 1, left + 1);
      const ratio = segment - left;
      glint.position.set(
        ordered[left]!.centerX + (ordered[right]!.centerX - ordered[left]!.centerX) * ratio,
        ordered[left]!.centerY + (ordered[right]!.centerY - ordered[left]!.centerY) * ratio,
      );
      glint.rotation = raw * Math.PI;
      glint.alpha = fadeOut(raw, 0.76);
      path.alpha = softPulse(raw, 0, 0.9) * 0.74;
      nodes.forEach((node, index) => { node.alpha = windowProgress(raw, index * 0.05, 0.4 + index * 0.04) * fadeOut(raw, 0.78); });
    });
    return;
  }

  if (design === "moonlight-dissolve") {
    const halo = new pixi.Graphics()
      .circle(centroid.x, centroid.y, cellSize * 0.48)
      .fill({ color: primary, alpha: 0.13 })
      .stroke({ color: secondary, width: Math.max(1, cellSize * 0.018), alpha: 0.58 });
    const stars = ordered.flatMap((rect, cellIndex) => Array.from({ length: 3 }, (_, index) => {
      const star = drawDiamond(new pixi.Graphics(), 0, 0, cellSize * (0.025 + index * 0.008))
        .fill({ color: index === 0 ? "#fffdf0" : secondary, alpha: 0.88 });
      star.position.set(rect.centerX + (index - 1) * cellSize * 0.12, rect.centerY);
      star.alpha = 0;
      layer.addChild(star);
      return { star, baseX: star.x, baseY: star.y, index: cellIndex * 3 + index };
    }));
    layer.addChildAt(halo, 0);
    await animate(duration, (raw) => {
      halo.alpha = softPulse(raw, 0, 0.86) * 0.65;
      halo.scale.set(0.72 + easeOutCubic(windowProgress(raw, 0, 0.6)) * 0.28);
      stars.forEach(({ star, baseX, baseY, index }) => {
        const local = windowProgress(raw, 0.14 + (index % 4) * 0.025, 0.92);
        star.alpha = Math.sin(local * Math.PI) * 0.9;
        star.position.set(baseX + Math.sin(index * 1.7) * cellSize * 0.08 * local, baseY - cellSize * (0.24 + index % 3 * 0.09) * local);
        star.rotation = local * (index % 2 === 0 ? 0.8 : -0.8);
      });
    });
    return;
  }

  if (design === "ember-ash") {
    const fissures = ordered.map((rect, index) => new pixi.Graphics()
      .moveTo(rect.x + rect.width * 0.28, rect.y + rect.height * 0.68)
      .lineTo(rect.centerX, rect.centerY)
      .lineTo(rect.x + rect.width * 0.7, rect.y + rect.height * 0.3)
      .stroke({ color: index % 2 === 0 ? primary : secondary, width: Math.max(1.1, cellSize * 0.02), alpha: 0.7 }));
    const embers = ordered.flatMap((rect, cellIndex) => Array.from({ length: 3 }, (_, index) => {
      const ember = new pixi.Graphics().circle(0, 0, Math.max(1.2, cellSize * 0.024)).fill({ color: index === 1 ? "#fff0b5" : primary, alpha: 0.9 });
      ember.position.set(rect.centerX + (index - 1) * cellSize * 0.13, rect.centerY + cellSize * 0.1);
      ember.alpha = 0;
      layer.addChild(ember);
      return { ember, baseX: ember.x, baseY: ember.y, index: cellIndex * 3 + index };
    }));
    layer.addChild(...fissures);
    await animate(duration, (raw) => {
      fissures.forEach((fissure, index) => { fissure.alpha = softPulse(raw, 0.04 + index * 0.025, 0.62 + index * 0.02) * 0.82; });
      embers.forEach(({ ember, baseX, baseY, index }) => {
        const local = windowProgress(raw, 0.2 + (index % 3) * 0.035, 0.94);
        ember.alpha = Math.sin(local * Math.PI) * 0.9;
        ember.position.set(baseX + Math.sin(index * 2.1) * cellSize * 0.1 * local, baseY - cellSize * (0.32 + index % 4 * 0.08) * local);
      });
    });
    return;
  }

  if (design === "prism-ribbon") {
    const colors = [primary, secondary, tertiary];
    const ribbons = colors.map((color, index) => {
      const ribbon = connectionPath(pixi, ordered.map((rect) => ({ ...rect, centerY: rect.centerY + (index - 1) * cellSize * 0.09 })), color, Math.max(2.5, cellSize * 0.065), 0.4);
      layer.addChild(ribbon);
      return ribbon;
    });
    const prism = new pixi.Graphics()
      .poly([
        centroid.x, centroid.y - cellSize * 0.2,
        centroid.x + cellSize * 0.18, centroid.y + cellSize * 0.14,
        centroid.x - cellSize * 0.18, centroid.y + cellSize * 0.14,
      ], true)
      .fill({ color: "#f6f0ff", alpha: 0.18 })
      .stroke({ color: "#ffffff", width: Math.max(1, cellSize * 0.016), alpha: 0.76 });
    layer.addChild(prism);
    await animate(duration, (raw) => {
      const gather = easeInOutCubic(windowProgress(raw, 0.08, 0.7));
      const exit = fadeOut(raw, 0.78);
      ribbons.forEach((ribbon, index) => {
        ribbon.alpha = Math.sin(windowProgress(raw, index * 0.04, 0.82) * Math.PI) * 0.82;
        ribbon.position.y = Math.sin(raw * Math.PI * 2 + index * 2.1) * cellSize * 0.025;
      });
      prism.alpha = windowProgress(raw, 0.3, 0.62) * exit;
      prism.rotation = (1 - gather) * -0.3;
      prism.scale.set(0.72 + gather * 0.28);
    });
    return;
  }

  if (design === "cosmos-fold") {
    const path = connectionPath(pixi, ordered, secondary, Math.max(1.2, cellSize * 0.022), 0.55);
    const cells = ordered.map((rect, index) => {
      const color = [primary, secondary, tertiary][index % 3]!;
      const ring = new pixi.Graphics().circle(rect.centerX, rect.centerY, cellSize * 0.29).stroke({ color, width: Math.max(1, cellSize * 0.018), alpha: 0.72 });
      const star = drawDiamond(new pixi.Graphics(), rect.centerX, rect.centerY, cellSize * 0.045).fill({ color: "#fffdf4", alpha: 0.9 });
      const cell = new pixi.Container();
      cell.addChild(ring, star);
      layer.addChild(cell);
      return { cell, ring, rect };
    });
    const core = new pixi.Graphics().circle(centroid.x, centroid.y, cellSize * 0.16).fill({ color: primary, alpha: 0.25 }).stroke({ color: secondary, width: 1.2, alpha: 0.7 });
    layer.addChildAt(path, 0);
    layer.addChild(core);
    await animate(duration, (raw) => {
      const gather = easeInOutCubic(windowProgress(raw, 0.3, 0.78));
      const exit = fadeOut(raw, 0.8);
      path.alpha = softPulse(raw, 0, 0.84) * 0.75;
      cells.forEach(({ cell, ring, rect }, index) => {
        const reveal = easeOutCubic(windowProgress(raw, index * 0.035, 0.42 + index * 0.025));
        cell.alpha = reveal * exit;
        cell.pivot.set(rect.centerX, rect.centerY);
        cell.position.set(rect.centerX + (centroid.x - rect.centerX) * gather * 0.18, rect.centerY + (centroid.y - rect.centerY) * gather * 0.18);
        cell.scale.set(1 - gather * 0.3);
        ring.rotation = (index % 2 === 0 ? 1 : -1) * raw * 0.35;
      });
      core.alpha = windowProgress(raw, 0.42, 0.68) * exit;
      core.scale.set(0.65 + gather * 0.35);
    });
    return;
  }

  const colors = [primary, secondary, tertiary];
  const flows = colors.map((color, index) => {
    const flow = connectionPath(pixi, ordered.map((rect) => ({ ...rect, centerY: rect.centerY + (index - 1) * cellSize * 0.08 })), color, Math.max(2.2, cellSize * 0.052), 0.5);
    layer.addChild(flow);
    return flow;
  });
  const mark = drawTangoOutlineMark(pixi, cellSize * 0.72, "#fff8e8", primary);
  mark.position.set(centroid.x, centroid.y);
  mark.alpha = 0;
  layer.addChild(mark);
  await animate(duration, (raw) => {
    const merge = easeInOutCubic(windowProgress(raw, 0.12, 0.68));
    const exit = fadeOut(raw, 0.82);
    flows.forEach((flow, index) => {
      flow.alpha = Math.sin(windowProgress(raw, index * 0.04, 0.8) * Math.PI) * 0.82;
      flow.position.y = (index - 1) * cellSize * 0.08 * (1 - merge);
    });
    mark.alpha = windowProgress(raw, 0.42, 0.68) * exit;
    mark.scale.set(0.72 + merge * 0.28);
  });
}

export function TangoBoardFx({
  boardRef,
  lastPlaced,
  scoringCells,
  placementPreset = "default",
  scorePreset = "default",
  placementColors,
  scoreColors,
  motionStyle = "legacy",
  placementSequenceKey = 0,
  scoreSequenceKey = 0,
  onReadyChange,
}: TangoBoardFxProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const pixiRef = useRef<PixiModule | null>(null);
  const placementLayerRef = useRef<Container | null>(null);
  const scoreLayerRef = useRef<Container | null>(null);
  const placementSequenceRef = useRef(0);
  const scoreSequenceRef = useRef(0);
  const rafsRef = useRef(new Set<number>());
  const [ready, setReady] = useState(false);
  const placementKey = lastPlaced === null
    ? `none:${placementSequenceKey}`
    : `${lastPlaced.row}:${lastPlaced.col}:${placementSequenceKey}`;
  const scoringKey = `${Array.from(scoringCells).sort().join("|")}:${scoreSequenceKey}`;
  const placementColorKey = placementColors.join("|");
  const scoreColorKey = scoreColors.join("|");
  const designs = resolveBoardFxDesign(placementPreset, scorePreset);

  const cancelSequence = useCallback((sequenceRef: SequenceRef) => {
    sequenceRef.current += 1;
  }, []);

  const cancelAll = useCallback(() => {
    cancelSequence(placementSequenceRef);
    cancelSequence(scoreSequenceRef);
    for (const raf of rafsRef.current) cancelAnimationFrame(raf);
    rafsRef.current.clear();
  }, [cancelSequence]);

  const tween = useCallback((
    duration: number,
    sequenceRef: SequenceRef,
    sequence: number,
    update: (progress: number) => void,
  ) => new Promise<void>((resolve) => {
    const startedAt = performance.now();
    const frame = (now: number) => {
      if (sequence !== sequenceRef.current) {
        resolve();
        return;
      }
      const progress = Math.min(1, (now - startedAt) / duration);
      update(progress);
      if (progress >= 1) {
        resolve();
        return;
      }
      const id = requestAnimationFrame(frame);
      rafsRef.current.add(id);
    };
    const id = requestAnimationFrame(frame);
    rafsRef.current.add(id);
  }), []);

  const rectFor = useCallback((row: number, col: number): CellRect | null => {
    const board = boardRef.current;
    const host = hostRef.current;
    if (board === null || host === null) return null;
    const cell = board.querySelector<HTMLElement>(`[data-cell-row="${row}"][data-cell-col="${col}"]`);
    if (cell === null) return null;
    const cellRect = cell.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const x = cellRect.left - hostRect.left;
    const y = cellRect.top - hostRect.top;
    return {
      x,
      y,
      width: cellRect.width,
      height: cellRect.height,
      centerX: x + (cellRect.width / 2),
      centerY: y + (cellRect.height / 2),
    };
  }, [boardRef]);

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    let disposed = false;
    let initializedApp: Application | null = null;

    void (async () => {
      if (disposed || hostRef.current === null) return;
      const app = new pixi.Application();
      await app.init({
        resizeTo: hostRef.current,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        preference: "webgl",
      });
      if (disposed || hostRef.current === null) {
        app.destroy(true, { children: true });
        return;
      }
      initializedApp = app;
      app.canvas.className = "tango-board-fx-canvas";
      app.canvas.setAttribute("aria-hidden", "true");
      hostRef.current.appendChild(app.canvas);
      appRef.current = app;
      pixiRef.current = pixi;
      setReady(true);
      onReadyChange?.(true);
    })().catch((error: unknown) => {
      console.error("[TangoBoardFx] Failed to initialize the effect renderer.", error);
      onReadyChange?.(false);
      // The restrained CSS feedback remains available when WebGL cannot initialize.
    });

    return () => {
      disposed = true;
      setReady(false);
      onReadyChange?.(false);
      cancelAll();
      destroyLayer(placementLayerRef.current);
      destroyLayer(scoreLayerRef.current);
      initializedApp?.destroy(true, { children: true });
      appRef.current = null;
      pixiRef.current = null;
    };
  }, [cancelAll, onReadyChange]);

  useEffect(() => {
    const app = appRef.current;
    const pixi = pixiRef.current;
    if (!ready || app === null || pixi === null || lastPlaced === null) return;

    cancelSequence(placementSequenceRef);
    const sequence = placementSequenceRef.current;
    destroyLayer(placementLayerRef.current);
    const rect = rectFor(lastPlaced.row, lastPlaced.col);
    if (rect === null) return;

    const primary = safeColor(placementColors[0]);
    const secondary = safeColor(placementColors[1] ?? placementColors[0]);
    const layer = new pixi.Container();
    placementLayerRef.current = layer;
    app.stage.addChild(layer);

    const run = async () => {
      if (motionStyle === "refined") {
        await renderRefinedPlacement({
          pixi,
          layer,
          rect,
          design: designs.placement,
          primary,
          secondary,
          animate: (duration, update) => tween(duration, placementSequenceRef, sequence, update),
        });
      } else if (designs.placement === "maple-tap") {
        const inset = Math.max(3, rect.width * 0.055);
        const shadow = new pixi.Graphics()
          .roundRect(rect.x + inset, rect.y + inset + 2, rect.width - inset * 2, rect.height - inset * 2, rect.width * 0.11)
          .fill({ color: "#241810", alpha: 0.32 });
        const grain = new pixi.Graphics();
        for (const ratio of [0.34, 0.5, 0.66]) {
          grain.moveTo(rect.x + rect.width * 0.2, rect.y + rect.height * ratio)
            .bezierCurveTo(
              rect.x + rect.width * 0.38, rect.y + rect.height * (ratio - 0.035),
              rect.x + rect.width * 0.62, rect.y + rect.height * (ratio + 0.035),
              rect.x + rect.width * 0.8, rect.y + rect.height * ratio,
            );
        }
        grain.stroke({ color: primary, width: 0.9, alpha: 0.48 });
        const edge = new pixi.Graphics()
          .roundRect(rect.x + inset, rect.y + inset, rect.width - inset * 2, rect.height - inset * 2, rect.width * 0.11)
          .stroke({ color: primary, width: 1.4, alpha: 0.88 });
        layer.addChild(shadow, grain, edge);
        await tween(320, placementSequenceRef, sequence, (raw) => {
          const settle = easeOutCubic(raw);
          const pressure = raw < 0.46 ? raw / 0.46 : (1 - raw) / 0.54;
          layer.scale.set(1 + (1 - settle) * 0.045, 0.94 + settle * 0.06);
          layer.position.set(-rect.centerX * (layer.scale.x - 1), -rect.centerY * (layer.scale.y - 1));
          shadow.alpha = 0.85 * pressure;
          grain.alpha = pressure;
          edge.alpha = Math.min(1, pressure * 1.25);
        });
      } else if (designs.placement === "cosmos-orbit") {
        const orbit = new pixi.Graphics()
          .ellipse(rect.centerX, rect.centerY, rect.width * 0.57, rect.height * 0.29)
          .stroke({ color: primary, width: 1.05, alpha: 0.68 });
        const counterOrbit = new pixi.Graphics()
          .ellipse(rect.centerX, rect.centerY, rect.width * 0.35, rect.height * 0.54)
          .stroke({ color: secondary, width: 0.8, alpha: 0.44 });
        counterOrbit.rotation = -0.42;
        counterOrbit.pivot.set(rect.centerX, rect.centerY);
        counterOrbit.position.set(rect.centerX, rect.centerY);
        const core = new pixi.Graphics()
          .circle(rect.centerX, rect.centerY, Math.max(2, rect.width * 0.045))
          .fill({ color: secondary, alpha: 0.8 });
        const stars = [
          [rect.centerX - rect.width * 0.34, rect.centerY - rect.height * 0.2, primary],
          [rect.centerX + rect.width * 0.32, rect.centerY + rect.height * 0.17, secondary],
          [rect.centerX + rect.width * 0.1, rect.centerY - rect.height * 0.4, primary],
        ] as const;
        const starGraphics = stars.map(([x, y, color], index) => {
          const star = drawDiamond(new pixi.Graphics(), x, y, Math.max(1.5, rect.width * (0.025 + index * 0.004)))
            .fill({ color, alpha: 0.9 });
          layer.addChild(star);
          return star;
        });
        layer.addChild(orbit, counterOrbit, core);
        await tween(350, placementSequenceRef, sequence, (raw) => {
          const reveal = raw < 0.58 ? easeOutCubic(raw / 0.58) : 1;
          const exit = raw < 0.72 ? 1 : 1 - easeOutCubic((raw - 0.72) / 0.28);
          layer.alpha = reveal * exit;
          orbit.rotation = -0.16 + raw * 0.32;
          orbit.pivot.set(rect.centerX, rect.centerY);
          orbit.position.set(rect.centerX, rect.centerY);
          counterOrbit.rotation = -0.42 - raw * 0.24;
          core.scale.set(0.72 + reveal * 0.28);
          starGraphics.forEach((star, index) => {
            star.alpha = Math.min(1, reveal * (0.7 + index * 0.15));
          });
        });
      } else {
        const inset = Math.max(3, rect.width * 0.055);
        const surface = new pixi.Graphics()
          .roundRect(rect.x + inset, rect.y + inset, rect.width - inset * 2, rect.height - inset * 2, rect.width * 0.11)
          .fill({ color: primary, alpha: 0.07 });
        const outline = new pixi.Graphics()
          .roundRect(rect.x + inset, rect.y + inset, rect.width - inset * 2, rect.height - inset * 2, rect.width * 0.11)
          .stroke({ color: primary, width: 1.1, alpha: 0.72 });
        layer.addChild(surface, outline);
        await tween(260, placementSequenceRef, sequence, (raw) => {
          const pulse = raw < 0.4 ? raw / 0.4 : (1 - raw) / 0.6;
          layer.alpha = Math.max(0, pulse);
        });
      }
      if (sequence === placementSequenceRef.current) {
        destroyLayer(layer);
        if (placementLayerRef.current === layer) placementLayerRef.current = null;
      }
    };

    void run();
    return () => {
      cancelSequence(placementSequenceRef);
      destroyLayer(layer);
      if (placementLayerRef.current === layer) placementLayerRef.current = null;
    };
  }, [
    cancelSequence,
    designs.placement,
    motionStyle,
    placementColorKey,
    placementKey,
    ready,
    rectFor,
    tween,
  ]);

  useEffect(() => {
    const app = appRef.current;
    const pixi = pixiRef.current;
    if (!ready || app === null || pixi === null || scoringCells.size === 0) return;

    cancelSequence(scoreSequenceRef);
    const sequence = scoreSequenceRef.current;
    destroyLayer(scoreLayerRef.current);
    const rects = Array.from(scoringCells).map((key) => {
      const [row, col] = key.split(":").map(Number);
      return rectFor(row!, col!);
    }).filter((rect): rect is CellRect => rect !== null);
    if (rects.length === 0) return;

    const primary = safeColor(scoreColors[0]);
    const secondary = safeColor(scoreColors[1] ?? scoreColors[0]);
    const tertiary = safeColor(scoreColors[2] ?? scoreColors[1] ?? scoreColors[0]);
    const layer = new pixi.Container();
    scoreLayerRef.current = layer;
    app.stage.addChild(layer);
    const centroid = rects.reduce((point, rect) => ({
      x: point.x + rect.centerX / rects.length,
      y: point.y + rect.centerY / rects.length,
    }), { x: 0, y: 0 });

    const run = async () => {
      if (motionStyle === "refined") {
        await renderRefinedScore({
          pixi,
          layer,
          rects,
          design: designs.score,
          primary,
          secondary,
          tertiary,
          animate: (duration, update) => tween(duration, scoreSequenceRef, sequence, update),
        });
      } else if (designs.score === "maple-fade") {
        const ordered = [...rects].sort((a, b) => (a.centerX + a.centerY) - (b.centerX + b.centerY));
        const panels = ordered.map((rect, index) => {
          const panel = new pixi.Graphics()
            .roundRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, rect.width * 0.1)
            .fill({ color: primary, alpha: 0.12 })
            .stroke({ color: primary, width: 1.05, alpha: 0.62 });
          panel.alpha = 0;
          layer.addChild(panel);
          return { panel, rect, index };
        });
        const seam = new pixi.Graphics();
        ordered.forEach((rect, index) => {
          if (index === 0) seam.moveTo(rect.centerX, rect.centerY);
          else seam.lineTo(rect.centerX, rect.centerY);
        });
        seam.stroke({ color: primary, width: 1.25, alpha: 0.55 });
        layer.addChild(seam);
        await tween(350, scoreSequenceRef, sequence, (raw) => {
          panels.forEach(({ panel, rect, index }) => {
            const local = Math.max(0, Math.min(1, (raw - index * 0.055) / 0.58));
            const reveal = easeOutCubic(local);
            const exit = raw < 0.68 ? 1 : 1 - easeOutCubic((raw - 0.68) / 0.32);
            panel.alpha = reveal * exit;
            const pull = easeInOutCubic(Math.max(0, (raw - 0.46) / 0.54)) * 3.5;
            const distance = Math.hypot(centroid.x - rect.centerX, centroid.y - rect.centerY) || 1;
            panel.position.set(
              ((centroid.x - rect.centerX) / distance) * pull,
              ((centroid.y - rect.centerY) / distance) * pull,
            );
          });
          seam.alpha = raw < 0.56 ? easeOutCubic(raw / 0.56) : 1 - easeOutCubic((raw - 0.56) / 0.44);
        });
      } else if (designs.score === "cosmos-fold") {
        const ordered = [...rects].sort((a, b) => {
          if (Math.abs(a.centerY - b.centerY) > 1) return a.centerY - b.centerY;
          return a.centerX - b.centerX;
        });
        const board = boardRef.current;
        const host = hostRef.current;
        const boardBounds = board?.getBoundingClientRect();
        const hostBounds = host?.getBoundingClientRect();
        const boardMask = boardBounds !== undefined && hostBounds !== undefined
          ? new pixi.Graphics()
            .roundRect(
              boardBounds.left - hostBounds.left,
              boardBounds.top - hostBounds.top,
              boardBounds.width,
              boardBounds.height,
              Math.max(6, ordered[0]!.width * 0.15),
            )
            .fill({ color: "#ffffff" })
          : null;
        const cosmos = new pixi.Container();
        if (boardMask !== null) cosmos.mask = boardMask;

        const connection = new pixi.Graphics();
        ordered.forEach((rect, index) => {
          if (index === 0) connection.moveTo(rect.centerX, rect.centerY);
          else connection.lineTo(rect.centerX, rect.centerY);
        });
        connection.stroke({ color: secondary, width: 2.1, alpha: 0.62 });
        connection.alpha = 0;

        const cells = ordered.map((rect, index) => {
          const color = [primary, secondary, tertiary][index % 3]!;
          const halo = new pixi.Graphics()
            .circle(rect.centerX, rect.centerY, rect.width * 0.37)
            .fill({ color, alpha: 0.12 });
          const ring = new pixi.Graphics()
            .circle(rect.centerX, rect.centerY, rect.width * 0.31)
            .stroke({ color, width: 1.15, alpha: 0.78 });
          const glint = new pixi.Graphics()
            .circle(rect.centerX, rect.centerY, Math.max(1.8, rect.width * 0.035))
            .fill({ color: "#f3efff", alpha: 0.92 });
          const cell = new pixi.Container();
          cell.addChild(halo, ring, glint);
          cell.alpha = 0;
          cosmos.addChild(cell);
          return { cell, halo, ring, glint, rect };
        });

        const particleOffsets = [
          [-0.42, -0.25], [-0.24, 0.33], [-0.04, -0.38],
          [0.18, 0.31], [0.39, -0.18], [0.46, 0.16],
        ] as const;
        const particles = particleOffsets.map(([offsetX, offsetY], index) => {
          const particle = new pixi.Graphics()
            .circle(0, 0, Math.max(1.15, ordered[0]!.width * (index % 3 === 0 ? 0.022 : 0.016)))
            .fill({ color: index % 2 === 0 ? primary : tertiary, alpha: 0.84 });
          const startX = centroid.x + ordered[0]!.width * offsetX;
          const startY = centroid.y + ordered[0]!.height * offsetY;
          particle.position.set(startX, startY);
          particle.alpha = 0;
          cosmos.addChild(particle);
          return { particle, startX, startY };
        });

        cosmos.addChildAt(connection, 0);
        if (boardMask !== null) layer.addChild(boardMask);
        layer.addChild(cosmos);

        await tween(980, scoreSequenceRef, sequence, (raw) => {
          const traceIn = easeInOutCubic(Math.min(1, raw / 0.32));
          const gather = easeInOutCubic(Math.max(0, Math.min(1, (raw - 0.32) / 0.42)));
          const exit = raw < 0.76 ? 1 : 1 - easeInOutCubic((raw - 0.76) / 0.24);
          connection.alpha = traceIn * (1 - gather * 0.46) * exit;
          cells.forEach(({ cell, halo, ring, glint, rect }, index) => {
            const reveal = easeOutCubic(Math.max(0, Math.min(1, (raw - index * 0.045) / 0.32)));
            cell.alpha = reveal * exit;
            cell.pivot.set(rect.centerX, rect.centerY);
            cell.position.set(
              rect.centerX + (centroid.x - rect.centerX) * gather * 0.08,
              rect.centerY + (centroid.y - rect.centerY) * gather * 0.08,
            );
            const scale = 1 - gather * 0.16;
            cell.scale.set(scale);
            halo.alpha = 0.48 * reveal * exit;
            ring.alpha = (0.64 + gather * 0.2) * exit;
            ring.rotation = (index % 2 === 0 ? 1 : -1) * raw * 0.08;
            glint.alpha = Math.min(1, reveal * 1.3) * exit;
          });
          particles.forEach(({ particle, startX, startY }, index) => {
            const local = easeOutCubic(Math.max(0, Math.min(1, (raw - 0.18 - index * 0.025) / 0.46)));
            particle.alpha = local * exit * 0.84;
            particle.position.set(
              startX + (centroid.x - startX) * gather * 0.58,
              startY + (centroid.y - startY) * gather * 0.58,
            );
          });
        });
      } else {
        const ordered = scorePreset === "sweep"
          ? [...rects].sort((a, b) => (a.centerX + a.centerY) - (b.centerX + b.centerY))
          : rects;
        const traces = ordered.map((rect) => {
          const trace = new pixi.Graphics()
            .roundRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, rect.width * 0.1)
            .fill({ color: primary, alpha: scorePreset === "wash" ? 0.11 : 0.055 })
            .stroke({ color: primary, width: scorePreset === "glint" ? 1.55 : 1.1, alpha: 0.72 });
          trace.alpha = 0;
          layer.addChild(trace);
          return trace;
        });
        await tween(450, scoreSequenceRef, sequence, (raw) => {
          traces.forEach((trace, index) => {
            const reveal = easeOutCubic(Math.max(0, Math.min(1, (raw - index * 0.05) / 0.5)));
            const exit = raw < 0.62 ? 1 : 1 - easeOutCubic((raw - 0.62) / 0.38);
            trace.alpha = reveal * exit;
          });
          if (scorePreset === "lift") layer.y = -4 * easeOutCubic(raw);
        });
      }
      if (sequence === scoreSequenceRef.current) {
        destroyLayer(layer);
        if (scoreLayerRef.current === layer) scoreLayerRef.current = null;
      }
    };

    void run();
    return () => {
      cancelSequence(scoreSequenceRef);
      destroyLayer(layer);
      if (scoreLayerRef.current === layer) scoreLayerRef.current = null;
    };
  }, [
    cancelSequence,
    designs.score,
    motionStyle,
    ready,
    rectFor,
    scoreColorKey,
    scorePreset,
    scoringKey,
    tween,
  ]);

  return (
    <div
      className="tango-board-fx"
      data-placement-design={designs.placement}
      data-score-design={designs.score}
      data-motion-style={motionStyle}
      ref={hostRef}
      aria-hidden="true"
    />
  );
}
