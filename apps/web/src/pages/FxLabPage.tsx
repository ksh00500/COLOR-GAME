import { useEffect, useRef, useState } from "react";
import type { Position } from "@color-game/shared-types";
import { TangoBoardFx } from "../components/TangoBoardFx";
import "./fx-lab.css";

type FxPhase = "idle" | "placement" | "scoring" | "complete";
type PlacementChoice = "tap" | "orbit";
type ScoreChoice = "fade" | "cosmos-fold";

const TARGET_CELLS = [11, 12, 13] as const;
const TARGET_KEYS = new Set(["2:1", "2:2", "2:3"]);
const CENTER_POSITION: Position = { row: 2, col: 2 };

const initialTiles: Record<number, "a" | "b" | "c"> = {
  2: "a",
  6: "c",
  11: "b",
  13: "b",
  18: "a",
  22: "c",
};

const placementOptions: Array<{
  id: PlacementChoice;
  rarity: string;
  name: string;
  description: string;
  colors: readonly string[];
}> = [
  {
    id: "tap",
    rarity: "COMMON",
    name: "메이플 탭",
    description: "원목 표면이 짧게 눌리며 단단하게 안착합니다.",
    colors: ["#d9a45d"],
  },
  {
    id: "orbit",
    rarity: "LEGENDARY",
    name: "코스모스 오비트",
    description: "얇은 두 궤도와 별빛 좌표가 타일을 감쌉니다.",
    colors: ["#8b7de4", "#56d2ca"],
  },
];

const scoreOptions: Array<{
  id: ScoreChoice;
  rarity: string;
  name: string;
  description: string;
  colors: readonly string[];
}> = [
  {
    id: "fade",
    rarity: "COMMON",
    name: "메이플 페이드",
    description: "연결된 원목 패널이 중심으로 정돈되어 사라집니다.",
    colors: ["#d9a45d"],
  },
  {
    id: "cosmos-fold",
    rarity: "LEGENDARY",
    name: "코스모스 폴드",
    description: "별빛 면과 좌표가 공간을 접듯 한 점으로 모입니다.",
    colors: ["#8b7de4", "#56d2ca", "#d7c4ff"],
  },
];

const phaseCopy: Record<FxPhase, { eyebrow: string; title: string; detail: string }> = {
  idle: {
    eyebrow: "READY",
    title: "두 상품을 고르고 재생하세요",
    detail: "실제 게임 렌더러에서 배치와 득점이 서로 다른 타이밍으로 실행됩니다.",
  },
  placement: {
    eyebrow: "01 · PLACEMENT",
    title: "선택한 배치 효과가 먼저 재생됩니다",
    detail: "중앙 타일 한 칸에만 짧고 명확한 안착 피드백을 남깁니다.",
  },
  scoring: {
    eyebrow: "02 · SCORE",
    title: "연결이 완성된 뒤 득점 효과가 시작됩니다",
    detail: "배치 연출을 반복하지 않고 세 타일의 정리 과정만 보여줍니다.",
  },
  complete: {
    eyebrow: "COMPLETE",
    title: "상품별 시퀀스가 완료됐습니다",
    detail: "다른 조합을 골라 일반과 전설의 밀도 차이를 바로 비교할 수 있습니다.",
  },
};

export function FxLabPage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const [placement, setPlacement] = useState<PlacementChoice>("tap");
  const [score, setScore] = useState<ScoreChoice>("fade");
  const [phase, setPhase] = useState<FxPhase>("idle");
  const [lastPlaced, setLastPlaced] = useState<Position | null>(null);
  const [scoringCells, setScoringCells] = useState<Set<string>>(new Set());
  const playing = phase === "placement" || phase === "scoring";
  const copy = phaseCopy[phase];
  const placementOption = placementOptions.find((option) => option.id === placement)!;
  const scoreOption = scoreOptions.find((option) => option.id === score)!;

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const play = () => {
    if (playing) return;
    clearTimers();
    setLastPlaced(null);
    setScoringCells(new Set());
    setPhase("placement");
    timersRef.current.push(window.setTimeout(() => setLastPlaced(CENTER_POSITION), 40));
    timersRef.current.push(window.setTimeout(() => {
      setPhase("scoring");
      setScoringCells(new Set(TARGET_KEYS));
    }, 520));
    timersRef.current.push(window.setTimeout(() => {
      setScoringCells(new Set());
      setPhase("complete");
    }, 1_320));
  };

  return (
    <main className="fx-lab-page">
      <header className="fx-lab-header">
        <div className="fx-lab-brand" aria-label="Tango FX Lab">
          <span><i /><i /><i /></span>
          <strong>TANGO</strong>
        </div>
        <span className="fx-lab-build">LOCAL PROTOTYPE · LIVE GAME RENDERER</span>
      </header>

      <section className="fx-lab-hero">
        <div className="fx-lab-copy">
          <p className="fx-lab-kicker">SIGNATURE EFFECT STUDY · 03</p>
          <h1>상품별 연출</h1>
          <p className="fx-lab-lead">공통 효과를 색만 바꾸지 않고, 각 상품의 이름과 재질에서 출발한 고유 동작으로 다시 설계했습니다.</p>

          <fieldset className="fx-lab-picker">
            <legend>배치 효과</legend>
            {placementOptions.map((option) => (
              <button
                className={placement === option.id ? "active" : ""}
                key={option.id}
                onClick={() => setPlacement(option.id)}
                type="button"
              >
                <span>{option.rarity}</span>
                <strong>{option.name}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </fieldset>

          <fieldset className="fx-lab-picker">
            <legend>득점 효과</legend>
            {scoreOptions.map((option) => (
              <button
                className={score === option.id ? "active" : ""}
                key={option.id}
                onClick={() => setScore(option.id)}
                type="button"
              >
                <span>{option.rarity}</span>
                <strong>{option.name}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </fieldset>

          <div className="fx-lab-status" aria-live="polite">
            <span>{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <p>{copy.detail}</p>
          </div>

          <button className="fx-lab-play" type="button" disabled={playing} onClick={play}>
            <span>{playing ? "재생 중" : phase === "idle" ? "선택 조합 재생" : "다시 재생"}</span>
            <i aria-hidden="true">▶</i>
          </button>
        </div>

        <div className={`fx-lab-board-wrap phase-${phase}`}>
          <div className="fx-lab-board-heading">
            <div><span>SHARED COLOR FIELD</span><strong>월넛 보드</strong></div>
            <b>3 = 1PT · 4 = 2PT · 5 = 4PT</b>
          </div>
          <div className="fx-lab-board-stage">
            <div className="fx-lab-board" ref={boardRef}>
              {Array.from({ length: 25 }, (_, index) => {
                const row = Math.floor(index / 5);
                const col = index % 5;
                const target = TARGET_CELLS.includes(index as typeof TARGET_CELLS[number]);
                const centerTile = index === 12 && phase !== "idle";
                const cleared = target && phase === "complete";
                const tile = centerTile ? "b" : initialTiles[index];
                return (
                  <span
                    className={`fx-lab-cell ${target ? "target" : ""} ${cleared ? "cleared" : ""}`}
                    data-cell-row={row}
                    data-cell-col={col}
                    key={index}
                  >
                    {tile !== undefined && <i className={`fx-lab-tile tile-${tile}`} />}
                  </span>
                );
              })}
            </div>
            <TangoBoardFx
              boardRef={boardRef}
              lastPlaced={lastPlaced}
              scoringCells={scoringCells}
              placementPreset={placement}
              scorePreset={score}
              placementColors={placementOption.colors}
              scoreColors={scoreOption.colors}
            />
            <span className="fx-lab-board-glow" aria-hidden="true" />
          </div>
          <div className="fx-lab-selection-summary">
            <span><b>배치</b>{placementOption.name}</span>
            <i aria-hidden="true" />
            <span><b>득점</b>{scoreOption.name}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
