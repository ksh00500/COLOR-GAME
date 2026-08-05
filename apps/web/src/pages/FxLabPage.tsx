import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Application } from "pixi.js";
import "./fx-lab.css";

type FxPhase = "idle" | "placement" | "connection" | "clearing" | "complete";

interface CellRect {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface FxCanvasProps {
  runId: number;
  boardRef: RefObject<HTMLDivElement>;
  onReady: () => void;
  onPhase: (phase: FxPhase) => void;
}

const TARGET_CELLS = [11, 12, 13] as const;

const easeOutCubic = (value: number) => 1 - ((1 - value) ** 3);

function FxCanvas({ runId, boardRef, onReady, onPhase }: FxCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const pixiRef = useRef<typeof import("pixi.js") | null>(null);
  const sequenceRef = useRef(0);
  const rafsRef = useRef(new Set<number>());

  const stopAnimations = useCallback(() => {
    sequenceRef.current += 1;
    for (const raf of rafsRef.current) cancelAnimationFrame(raf);
    rafsRef.current.clear();
  }, []);

  useEffect(() => {
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
      app.canvas.className = "fx-lab-canvas-element";
      app.canvas.setAttribute("aria-hidden", "true");
      hostRef.current.appendChild(app.canvas);
      appRef.current = app;
      pixiRef.current = pixi;
      onReady();
    });

    return () => {
      disposed = true;
      stopAnimations();
      if (initializedApp !== null) initializedApp.destroy(true, { children: true });
      appRef.current = null;
      pixiRef.current = null;
    };
  }, [onReady, stopAnimations]);

  useEffect(() => {
    if (runId === 0 || appRef.current === null || pixiRef.current === null) return;
    const app = appRef.current;
    const pixi = pixiRef.current;
    const board = boardRef.current;
    const host = hostRef.current;
    if (board === null || host === null) return;

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
    const rectFor = (index: number): CellRect => {
      const cell = board.querySelector<HTMLElement>(`[data-fx-cell="${index}"]`);
      if (cell === null) {
        const size = Math.min(app.screen.width, app.screen.height) / 6;
        return {
          x: (app.screen.width - size) / 2,
          y: (app.screen.height - size) / 2,
          width: size,
          height: size,
          centerX: app.screen.width / 2,
          centerY: app.screen.height / 2,
        };
      }
      const cellRect = cell.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      return {
        x: cellRect.left - hostRect.left + (cellRect.width / 2),
        y: cellRect.top - hostRect.top + (cellRect.height / 2),
        width: cellRect.width,
        height: cellRect.height,
        centerX: cellRect.left - hostRect.left + (cellRect.width / 2),
        centerY: cellRect.top - hostRect.top + (cellRect.height / 2),
      };
    };

    const run = async () => {
      const placementRect = rectFor(12);
      onPhase("placement");

      const placementOutline = new pixi.Graphics()
        .roundRect(
          placementRect.x - (placementRect.width / 2) + 3,
          placementRect.y - (placementRect.height / 2) + 3,
          placementRect.width - 6,
          placementRect.height - 6,
          Math.min(placementRect.width, placementRect.height) * 0.1,
        )
        .stroke({ color: 0xe5c89e, width: 1.25, alpha: 0.78 });
      app.stage.addChild(placementOutline);

      await tween(280, (raw) => {
        placementOutline.alpha = raw < 0.42 ? raw / 0.42 : (1 - raw) / 0.58;
      });

      if (sequence !== sequenceRef.current) return;
      placementOutline.destroy();
      await pause(90);
      if (sequence !== sequenceRef.current) return;

      onPhase("connection");
      const rects = TARGET_CELLS.map(rectFor) as [CellRect, CellRect, CellRect];
      const first = rects[0];
      const last = rects[2];
      const inset = 3;
      const groupX = first.x - (first.width / 2) - inset;
      const groupY = first.y - (first.height / 2) - inset;
      const groupWidth = (last.x + (last.width / 2)) - groupX + inset;
      const groupHeight = first.height + (inset * 2);
      const connection = new pixi.Container();
      app.stage.addChild(connection);
      const surface = new pixi.Graphics()
        .roundRect(groupX, groupY, groupWidth, groupHeight, Math.min(first.width, first.height) * 0.14)
        .fill({ color: 0xe2c49a, alpha: 0.055 });
      const perimeter = new pixi.Graphics()
        .roundRect(groupX, groupY, groupWidth, groupHeight, Math.min(first.width, first.height) * 0.14)
        .stroke({ color: 0xe2c49a, width: 1.35, alpha: 0.8 });
      const cellTraces = rects.map((rect) => new pixi.Graphics()
        .roundRect(
          rect.x - (rect.width / 2) + 5,
          rect.y - (rect.height / 2) + 5,
          rect.width - 10,
          rect.height - 10,
          Math.min(rect.width, rect.height) * 0.09,
        )
        .stroke({ color: 0xf0dac0, width: 0.75, alpha: 0.5 }));
      connection.addChild(surface, perimeter, ...cellTraces);

      await tween(430, (raw) => {
        const progress = easeOutCubic(raw);
        surface.alpha = progress * 0.8;
        perimeter.alpha = progress;
        cellTraces.forEach((trace, index) => {
          const local = Math.max(0, Math.min(1, (raw - (index * 0.1)) / 0.55));
          trace.alpha = local * 0.62;
        });
      });

      if (sequence !== sequenceRef.current) return;
      onPhase("clearing");
      const score = new pixi.Text({
        text: "+1",
        style: {
          fill: 0xf1ddc3,
          fontFamily: "Arial, sans-serif",
          fontSize: 28,
          fontWeight: "600",
          letterSpacing: 1,
        },
      });
      score.anchor.set(0.5);
      score.position.set(rects[1].centerX, groupY - 17);
      app.stage.addChild(score);

      await tween(520, (raw) => {
        const progress = easeOutCubic(raw);
        score.y = groupY - 17 - (7 * progress);
        score.alpha = raw < 0.18 ? raw / 0.18 : raw < 0.72 ? 1 : (1 - raw) / 0.28;
        connection.alpha = raw < 0.58 ? 1 : (1 - raw) / 0.42;
      });

      if (sequence !== sequenceRef.current) return;
      connection.destroy({ children: true });
      score.destroy();
      onPhase("complete");
    };

    void run();
    return stopAnimations;
  }, [boardRef, onPhase, runId, stopAnimations]);

  return <div className="fx-lab-canvas" ref={hostRef} />;
}

const initialTiles: Record<number, "a" | "b" | "c"> = {
  2: "a",
  6: "c",
  11: "b",
  13: "b",
  18: "a",
  22: "c",
};

const phaseCopy: Record<FxPhase, { eyebrow: string; title: string; detail: string }> = {
  idle: { eyebrow: "READY", title: "효과 재생을 눌러보세요", detail: "중앙 타일을 놓아 가로 3칸을 완성합니다." },
  placement: { eyebrow: "01 · PLACEMENT", title: "타일이 보드에 자리 잡습니다", detail: "튀거나 번지지 않고 짧은 압력감만 남깁니다." },
  connection: { eyebrow: "02 · CONNECTION", title: "연결된 영역의 윤곽이 드러납니다", detail: "타일을 가로지르는 광선 없이 세 칸의 관계만 표시합니다." },
  clearing: { eyebrow: "03 · SCORE", title: "득점만 짧게 남기고 정리됩니다", detail: "파편 대신 표면이 차분하게 사라지며 점수를 전달합니다." },
  complete: { eyebrow: "COMPLETE", title: "FX 시퀀스가 완료됐습니다", detail: "다시 재생해 전체 타이밍과 가독성을 확인할 수 있습니다." },
};

export function FxLabPage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [runId, setRunId] = useState(0);
  const [phase, setPhase] = useState<FxPhase>("idle");
  const playing = phase !== "idle" && phase !== "complete";
  const copy = phaseCopy[phase];

  const handleReady = useCallback(() => setReady(true), []);
  const handlePhase = useCallback((nextPhase: FxPhase) => setPhase(nextPhase), []);
  const play = () => {
    if (!ready || playing) return;
    setPhase("placement");
    setRunId((current) => current + 1);
  };

  return (
    <main className="fx-lab-page">
      <header className="fx-lab-header">
        <div className="fx-lab-brand" aria-label="Tango FX Lab">
          <span><i /><i /><i /></span>
          <strong>TANGO</strong>
        </div>
        <span className="fx-lab-build">LOCAL PROTOTYPE · PIXIJS</span>
      </header>

      <section className="fx-lab-hero">
        <div className="fx-lab-copy">
          <p className="fx-lab-kicker">TANGO EFFECT STUDY · 02</p>
          <h1>연결 윤곽</h1>
          <p className="fx-lab-lead">빛줄기와 파편 없이 보드의 윤곽, 재질, 짧은 점수 표시만으로 완성한 모던한 연출 시제품입니다.</p>

          <div className="fx-lab-status" aria-live="polite">
            <span>{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <p>{copy.detail}</p>
          </div>

          <button className="fx-lab-play" type="button" disabled={!ready || playing} onClick={play}>
            <span>{!ready ? "엔진 준비 중" : playing ? "재생 중" : runId === 0 ? "효과 재생" : "다시 재생"}</span>
            <i aria-hidden="true">▶</i>
          </button>

          <dl className="fx-lab-specs">
            <div><dt>렌더러</dt><dd>PixiJS · WebGL</dd></div>
            <div><dt>연출 시간</dt><dd>약 1.5초</dd></div>
            <div><dt>구성</dt><dd>안착 · 윤곽 · 정리</dd></div>
          </dl>
        </div>

        <div className={`fx-lab-board-wrap phase-${phase}`}>
          <div className="fx-lab-board-heading">
            <div><span>SHARED COLOR FIELD</span><strong>월넛 보드</strong></div>
            <b>3 = 1PT · 4 = 2PT · 5 = 4PT</b>
          </div>
          <div className="fx-lab-board-stage">
            <div className="fx-lab-board" ref={boardRef}>
              {Array.from({ length: 25 }, (_, index) => {
                const baseTile = initialTiles[index];
                const target = TARGET_CELLS.includes(index as typeof TARGET_CELLS[number]);
                const centerTile = index === 12 && phase !== "idle";
                const cleared = target && (phase === "clearing" || phase === "complete");
                const tile = centerTile ? "b" : baseTile;
                return (
                  <span
                    className={`fx-lab-cell ${target ? "target" : ""} ${cleared ? "cleared" : ""}`}
                    data-fx-cell={index}
                    key={index}
                  >
                    {tile !== undefined && <i className={`fx-lab-tile tile-${tile}`} />}
                  </span>
                );
              })}
            </div>
            <FxCanvas runId={runId} boardRef={boardRef} onReady={handleReady} onPhase={handlePhase} />
            <span className="fx-lab-board-glow" aria-hidden="true" />
          </div>
          <div className="fx-lab-board-footer">
            <span><i className="swatch-a" /> BURGUNDY</span>
            <span><i className="swatch-b" /> NAVY</span>
            <span><i className="swatch-c" /> DEEP GREEN</span>
          </div>
        </div>
      </section>
    </main>
  );
}
