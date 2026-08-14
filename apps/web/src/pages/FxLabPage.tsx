import { useEffect, useRef, useState } from "react";
import type { Position } from "@color-game/shared-types";
import { TangoBoardFx } from "../components/TangoBoardFx";
import { PLACEMENT_FX_DURATION_MS, resolveBoardFxDesign } from "../components/boardFxDesign";
import "./fx-lab.css";

type FxPhase = "idle" | "placement" | "complete";
type PlacementChoice = "tap" | "shadow" | "edge" | "stamp" | "leaf" | "ripple" | "ring" | "bloom" | "seal" | "fold" | "orbit" | "trinity";
type LabTheme = "dark" | "light";
type TileSurface = "bright" | "dark" | "gradient";

const TARGET_CELLS = [11, 12, 13] as const;
const CENTER_POSITION: Position = { row: 2, col: 2 };
const EMPTY_SCORING_CELLS = new Set<string>();

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
    id: "shadow",
    rarity: "COMMON",
    name: "월넛 섀도",
    description: "접지 그림자가 아래로 가라앉으며 무게감을 남깁니다.",
    colors: ["#765038"],
  },
  {
    id: "edge",
    rarity: "COMMON",
    name: "아이보리 클릭",
    description: "네 귀퉁이의 아이보리 캡이 들어와 맞물립니다.",
    colors: ["#eadbbd"],
  },
  {
    id: "stamp",
    rarity: "RARE",
    name: "차콜 스탬프",
    description: "실제 Tango 마크의 윤곽선만 인장처럼 찍힙니다.",
    colors: ["#47433d"],
  },
  {
    id: "leaf",
    rarity: "RARE",
    name: "모스 그레인",
    description: "이끼빛 음영이 타일 표면 안쪽을 부드럽게 스쳐 재질의 깊이를 더합니다.",
    colors: ["#7e9b63", "#c7d59b"],
  },
  {
    id: "ripple",
    rarity: "COMMON",
    name: "코스탈 리플",
    description: "타일 표면 자체가 3D 수면처럼 흔들려 안정됩니다.",
    colors: ["#53b9b5", "#8ed8d3"],
  },
  {
    id: "ring",
    rarity: "EPIC",
    name: "브라스 링",
    description: "세 축의 황동 궤도가 원자 구조처럼 회전한 뒤 중심핵에 잠깁니다.",
    colors: ["#d1a24f", "#fff0b8"],
  },
  {
    id: "bloom",
    rarity: "EPIC",
    name: "문라이트 블룸",
    description: "중심 달빛에서 여덟 장의 꽃잎이 사방으로 펼쳐집니다.",
    colors: ["#b8c6ed", "#7f88c9"],
  },
  {
    id: "seal",
    rarity: "EPIC",
    name: "엠버 실",
    description: "작은 3D 불티가 깊이를 달리하며 짧게 튀어 오릅니다.",
    colors: ["#f08b45", "#c44631"],
  },
  {
    id: "fold",
    rarity: "EPIC",
    name: "프리즘 애퍼처",
    description: "다층 유리 면이 접혀 중심 프리즘을 만들고 굴절광을 통과시킵니다.",
    colors: ["#d85472", "#52ad95", "#5d72d8"],
  },
  {
    id: "orbit",
    rarity: "LEGENDARY",
    name: "코스모스 오비트",
    description: "얇은 두 궤도와 별빛 좌표가 타일을 감쌉니다.",
    colors: ["#8b7de4", "#56d2ca"],
  },
  {
    id: "trinity",
    rarity: "LEGENDARY",
    name: "Tango 트리니티",
    description: "세 색 조각이 궤도를 돌아 Tango 마크로 결속되고 금빛 파장이 남습니다.",
    colors: ["#d84d63", "#36a173", "#4d6ed7"],
  },
];

const phaseCopy: Record<FxPhase, { eyebrow: string; title: string; detail: string }> = {
  idle: {
    eyebrow: "READY",
    title: "배치 효과를 고르고 재생하세요",
    detail: "12개 상품을 같은 게임 셀에서 비교할 수 있습니다.",
  },
  placement: {
    eyebrow: "01 · PLACEMENT",
    title: "선택한 배치 효과가 먼저 재생됩니다",
    detail: "중앙 타일 한 칸에만 짧고 명확한 안착 피드백을 남깁니다.",
  },
  complete: {
    eyebrow: "COMPLETE",
    title: "배치 연출이 완료됐습니다",
    detail: "다른 상품을 골라 등급별 밀도와 고유 동작을 비교해 보세요.",
  },
};

export function FxLabPage() {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const [placement, setPlacement] = useState<PlacementChoice>("tap");
  const [labTheme, setLabTheme] = useState<LabTheme>("dark");
  const [tileSurface, setTileSurface] = useState<TileSurface>("gradient");
  const [phase, setPhase] = useState<FxPhase>("idle");
  const [lastPlaced, setLastPlaced] = useState<Position | null>(null);
  const [playbackId, setPlaybackId] = useState(0);
  const playing = phase === "placement";
  const copy = phaseCopy[phase];
  const placementOption = placementOptions.find((option) => option.id === placement)!;
  const placementDesign = resolveBoardFxDesign(placement, undefined).placement;

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const play = (nextPlacement: PlacementChoice = placement, revealBoard = true) => {
    if (playing) return;
    clearTimers();
    const nextDesign = resolveBoardFxDesign(nextPlacement, undefined).placement;
    const nextDuration = PLACEMENT_FX_DURATION_MS[nextDesign];
    setPlacement(nextPlacement);
    setLastPlaced(null);
    setPlaybackId((value) => value + 1);
    setPhase("placement");
    if (revealBoard && window.matchMedia("(max-width: 900px)").matches) {
      boardWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    timersRef.current.push(window.setTimeout(() => setLastPlaced(CENTER_POSITION), revealBoard ? 360 : 40));
    timersRef.current.push(window.setTimeout(() => {
      setPhase("complete");
    }, nextDuration + (revealBoard ? 540 : 180)));
  };

  return (
    <main className={`fx-lab-page theme-${labTheme} surface-${tileSurface}`}>
      <header className="fx-lab-header">
        <div className="fx-lab-brand" aria-label="Tango FX Lab">
          <span><i /><i /><i /></span>
          <strong>TANGO</strong>
        </div>
        <span className="fx-lab-build">VISUAL QA · LIVE GAME RENDERER</span>
      </header>

      <section className="fx-lab-hero">
        <div className="fx-lab-copy">
          <p className="fx-lab-kicker">PLACEMENT EFFECT COLLECTION · 12</p>
          <h1>배치 효과</h1>
          <p className="fx-lab-lead">상품 이름과 재질에서 출발한 12개의 고유 동작입니다. 모든 연출은 셀 경계를 넘지 않고, 한 수가 안착하는 감각에 집중합니다.</p>

          <fieldset className="fx-lab-picker">
            <legend>배치 효과</legend>
            {placementOptions.map((option) => (
              <button
                className={placement === option.id ? "active" : ""}
                key={option.id}
                onClick={() => play(option.id)}
                type="button"
              >
                <span>{option.rarity}</span>
                <strong>{option.name}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </fieldset>

          <p className="fx-lab-next">득점 효과는 배치 효과 확정 후 별도 규격으로 다시 설계합니다.</p>

          <div className="fx-lab-view-controls" aria-label="검증 배경과 타일 표면">
            <div>
              <span>THEME</span>
              <button type="button" className={labTheme === "dark" ? "active" : ""} onClick={() => setLabTheme("dark")}>어둡게</button>
              <button type="button" className={labTheme === "light" ? "active" : ""} onClick={() => setLabTheme("light")}>밝게</button>
            </div>
            <div>
              <span>TILE</span>
              <button type="button" className={tileSurface === "bright" ? "active" : ""} onClick={() => setTileSurface("bright")}>밝은색</button>
              <button type="button" className={tileSurface === "dark" ? "active" : ""} onClick={() => setTileSurface("dark")}>어두운색</button>
              <button type="button" className={tileSurface === "gradient" ? "active" : ""} onClick={() => setTileSurface("gradient")}>그라데이션</button>
            </div>
          </div>

          <div className="fx-lab-status" aria-live="polite">
            <span>{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <p>{copy.detail}</p>
          </div>

          <button className="fx-lab-play" type="button" disabled={playing} onClick={() => play()}>
            <span>{playing ? "재생 중" : phase === "idle" ? "선택 조합 재생" : "다시 재생"}</span>
            <i aria-hidden="true">▶</i>
          </button>
        </div>

        <div className={`fx-lab-board-wrap phase-${phase}`} ref={boardWrapRef}>
          <div className="fx-lab-board-heading">
            <div><span>SHARED COLOR FIELD</span><strong>월넛 보드</strong></div>
            <b>3 = 1PT · 4 = 2PT · 5 = 4PT</b>
          </div>
          <div className="fx-lab-board-stage" data-placement-fx-engine="modern" data-placement-design={placementDesign}>
            <div className="fx-lab-board" ref={boardRef}>
              {Array.from({ length: 25 }, (_, index) => {
                const row = Math.floor(index / 5);
                const col = index % 5;
                const target = TARGET_CELLS.includes(index as typeof TARGET_CELLS[number]);
                const centerTile = index === 12 && phase !== "idle";
                const tile = centerTile ? "b" : initialTiles[index];
                return (
                  <span
                    className={`fx-lab-cell ${target ? "target" : ""}`}
                    data-cell-row={row}
                    data-cell-col={col}
                    key={centerTile ? `${index}:${playbackId}` : index}
                  >
                    {tile !== undefined && (
                      <i
                        className={`fx-lab-tile tile-${tile} ${centerTile ? "placement-tile-motion" : ""}`}
                        data-placement-motion={centerTile ? placementDesign : undefined}
                      />
                    )}
                  </span>
                );
              })}
            </div>
            <TangoBoardFx
              boardRef={boardRef}
              lastPlaced={lastPlaced}
              scoringCells={EMPTY_SCORING_CELLS}
              placementPreset={placement}
              scorePreset="fade"
              placementColors={placementOption.colors}
              scoreColors={["#d9a45d"]}
              motionStyle="refined"
              placementSequenceKey={playbackId}
            />
            <span className="fx-lab-board-glow" aria-hidden="true" />
          </div>
          <div className="fx-lab-selection-summary">
            <span><b>배치</b>{placementOption.name}</span>
            <i aria-hidden="true" />
            <span><b>등급</b>{placementOption.rarity}</span>
            <i aria-hidden="true" />
            <span><b>경계</b>셀 내부 고정</span>
          </div>
        </div>
      </section>
    </main>
  );
}
