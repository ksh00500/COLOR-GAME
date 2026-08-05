import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { Application, ColorSource } from "pixi.js";
import type { Position } from "@color-game/shared-types";

interface TangoBoardFxProps {
  boardRef: RefObject<HTMLDivElement>;
  lastPlaced: Position | null;
  scoringCells: Set<string>;
  scoreValue: number | null;
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

const FALLBACK_ACCENT = "#e2c49a";
const easeOutCubic = (value: number) => 1 - ((1 - value) ** 3);

function safeColor(value: string | undefined): ColorSource {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : FALLBACK_ACCENT;
}

export function TangoBoardFx({
  boardRef,
  lastPlaced,
  scoringCells,
  scoreValue,
  placementPreset = "default",
  scorePreset = "default",
  placementColors,
  scoreColors,
}: TangoBoardFxProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const pixiRef = useRef<typeof import("pixi.js") | null>(null);
  const sequenceRef = useRef(0);
  const rafsRef = useRef(new Set<number>());
  const placementKey = lastPlaced === null ? "none" : `${lastPlaced.row}:${lastPlaced.col}`;
  const scoringKey = Array.from(scoringCells).sort().join("|");
  const placementColorKey = placementColors.join("|");
  const scoreColorKey = scoreColors.join("|");

  const stopAnimations = useCallback(() => {
    sequenceRef.current += 1;
    for (const raf of rafsRef.current) cancelAnimationFrame(raf);
    rafsRef.current.clear();
  }, []);

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
    }).catch(() => {
      // The DOM/CSS feedback remains available when WebGL cannot initialize.
    });

    return () => {
      disposed = true;
      stopAnimations();
      initializedApp?.destroy(true, { children: true });
      appRef.current = null;
      pixiRef.current = null;
    };
  }, [stopAnimations]);

  useEffect(() => {
    const app = appRef.current;
    const pixi = pixiRef.current;
    const board = boardRef.current;
    const host = hostRef.current;
    if (app === null || pixi === null || board === null || host === null || lastPlaced === null) return;

    stopAnimations();
    const sequence = sequenceRef.current;
    app.stage.removeChildren().forEach((child) => child.destroy({ children: true }));

    const tween = (duration: number, update: (progress: number) => void) => new Promise<void>((resolve) => {
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
    });
    const pause = (duration: number) => tween(duration, () => undefined);

    const rectFor = (row: number, col: number): CellRect | null => {
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
    };

    const run = async () => {
      const placementRect = rectFor(lastPlaced.row, lastPlaced.col);
      if (placementRect === null) return;
      const placementColor = safeColor(placementColors[0]);
      const placement = new pixi.Container();
      const pressure = new pixi.Graphics()
        .roundRect(
          placementRect.x + 3,
          placementRect.y + 3,
          placementRect.width - 6,
          placementRect.height - 6,
          Math.min(placementRect.width, placementRect.height) * 0.12,
        )
        .fill({ color: placementColor, alpha: placementPreset === "default" ? 0.035 : 0.075 });
      const outline = new pixi.Graphics()
        .roundRect(
          placementRect.x + 3,
          placementRect.y + 3,
          placementRect.width - 6,
          placementRect.height - 6,
          Math.min(placementRect.width, placementRect.height) * 0.12,
        )
        .stroke({ color: placementColor, width: 1.15, alpha: placementPreset === "default" ? 0.52 : 0.82 });
      placement.addChild(pressure, outline);
      app.stage.addChild(placement);

      await tween(260, (raw) => {
        const rise = raw < 0.38 ? raw / 0.38 : (1 - raw) / 0.62;
        pressure.alpha = Math.max(0, rise * 0.85);
        outline.alpha = Math.max(0, rise);
      });
      placement.destroy({ children: true });

      if (sequence !== sequenceRef.current || scoringCells.size === 0) return;
      await pause(70);
      if (sequence !== sequenceRef.current) return;

      const rects = Array.from(scoringCells).map((key) => {
        const [row, col] = key.split(":").map(Number);
        return rectFor(row!, col!);
      }).filter((rect): rect is CellRect => rect !== null);
      if (rects.length === 0) return;

      const scoreColor = safeColor(scoreColors[0]);
      const traces = new pixi.Container();
      const ordered = scorePreset === "sweep"
        ? [...rects].sort((a, b) => (a.centerX + a.centerY) - (b.centerX + b.centerY))
        : rects;
      const traceGraphics = ordered.map((rect) => {
        const surface = new pixi.Graphics()
          .roundRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, Math.min(rect.width, rect.height) * 0.1)
          .fill({ color: scoreColor, alpha: scorePreset === "wash" ? 0.11 : 0.055 });
        const perimeter = new pixi.Graphics()
          .roundRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, Math.min(rect.width, rect.height) * 0.1)
          .stroke({ color: scoreColor, width: scorePreset === "glint" ? 1.55 : 1.1, alpha: 0.72 });
        const cell = new pixi.Container();
        cell.addChild(surface, perimeter);
        traces.addChild(cell);
        return cell;
      });
      app.stage.addChild(traces);

      await tween(390, (raw) => {
        traceGraphics.forEach((trace, index) => {
          const local = Math.max(0, Math.min(1, (raw - (index * 0.06)) / 0.62));
          trace.alpha = easeOutCubic(local);
        });
      });
      if (sequence !== sequenceRef.current) return;
      await pause(scoreValue !== null && scoreValue > 0 ? 150 : 70);
      await tween(360, (raw) => {
        traces.alpha = 1 - easeOutCubic(raw);
        if (scorePreset === "lift") traces.y = -4 * easeOutCubic(raw);
      });
      traces.destroy({ children: true });
    };

    void run();
    return stopAnimations;
  }, [
    boardRef,
    placementColorKey,
    placementKey,
    placementPreset,
    scoreColorKey,
    scorePreset,
    scoreValue,
    scoringKey,
    stopAnimations,
  ]);

  return <div className="tango-board-fx" ref={hostRef} aria-hidden="true" />;
}
