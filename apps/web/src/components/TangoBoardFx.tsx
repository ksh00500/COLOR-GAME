import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Application, ColorSource, Container, Graphics } from "pixi.js";
import type { Position } from "@color-game/shared-types";
import { resolveBoardFxDesign } from "./boardFxDesign";

interface TangoBoardFxProps {
  boardRef: RefObject<HTMLDivElement>;
  lastPlaced: Position | null;
  scoringCells: Set<string>;
  placementPreset?: string | undefined;
  scorePreset?: string | undefined;
  placementColors: readonly string[];
  scoreColors: readonly string[];
}

interface CellRect {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

type PixiModule = typeof import("pixi.js");
type SequenceRef = { current: number };

const FALLBACK_ACCENT = "#e2c49a";
const easeOutCubic = (value: number) => 1 - ((1 - value) ** 3);
const easeInOutCubic = (value: number) => value < 0.5
  ? 4 * value * value * value
  : 1 - ((-2 * value + 2) ** 3) / 2;

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

export function TangoBoardFx({
  boardRef,
  lastPlaced,
  scoringCells,
  placementPreset = "default",
  scorePreset = "default",
  placementColors,
  scoreColors,
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
  const placementKey = lastPlaced === null ? "none" : `${lastPlaced.row}:${lastPlaced.col}`;
  const scoringKey = Array.from(scoringCells).sort().join("|");
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

    void import("pixi.js").then(async (pixi) => {
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
    }).catch(() => {
      // The restrained CSS feedback remains available when WebGL cannot initialize.
    });

    return () => {
      disposed = true;
      setReady(false);
      cancelAll();
      destroyLayer(placementLayerRef.current);
      destroyLayer(scoreLayerRef.current);
      initializedApp?.destroy(true, { children: true });
      appRef.current = null;
      pixiRef.current = null;
    };
  }, [cancelAll]);

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
      if (designs.placement === "maple-press") {
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
      if (designs.score === "maple-resolve") {
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
        const cells = rects.map((rect, index) => {
          const color = [primary, secondary, tertiary][index % 3]!;
          const plane = new pixi.Graphics()
            .roundRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, rect.width * 0.1)
            .fill({ color, alpha: 0.08 })
            .stroke({ color, width: 1.15, alpha: 0.72 });
          const diagonal = new pixi.Graphics()
            .moveTo(rect.x + rect.width * 0.2, rect.y + rect.height * 0.8)
            .lineTo(rect.x + rect.width * 0.8, rect.y + rect.height * 0.2)
            .stroke({ color, width: 0.85, alpha: 0.46 });
          const pin = drawDiamond(new pixi.Graphics(), rect.centerX, rect.centerY, Math.max(1.6, rect.width * 0.028))
            .fill({ color, alpha: 0.9 });
          const cell = new pixi.Container();
          cell.addChild(plane, diagonal, pin);
          layer.addChild(cell);
          return { cell, rect };
        });
        const axis = new pixi.Graphics();
        rects.forEach((rect, index) => {
          if (index === 0) axis.moveTo(rect.centerX, rect.centerY);
          else axis.lineTo(rect.centerX, rect.centerY);
        });
        axis.stroke({ color: secondary, width: 1, alpha: 0.5 });
        layer.addChild(axis);
        await tween(650, scoreSequenceRef, sequence, (raw) => {
          const gather = easeInOutCubic(Math.max(0, (raw - 0.36) / 0.48));
          const exit = raw < 0.78 ? 1 : 1 - easeOutCubic((raw - 0.78) / 0.22);
          cells.forEach(({ cell, rect }, index) => {
            const reveal = easeOutCubic(Math.max(0, Math.min(1, (raw - index * 0.035) / 0.44)));
            cell.alpha = reveal * exit;
            cell.pivot.set(rect.centerX, rect.centerY);
            cell.position.set(
              rect.centerX + (centroid.x - rect.centerX) * gather * 0.12,
              rect.centerY + (centroid.y - rect.centerY) * gather * 0.12,
            );
            cell.scale.set(1 - gather * 0.075);
          });
          axis.alpha = (raw < 0.52 ? easeOutCubic(raw / 0.52) : 1 - easeOutCubic((raw - 0.52) / 0.48)) * exit;
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
      ref={hostRef}
      aria-hidden="true"
    />
  );
}
