import { useEffect, useRef, useState } from "react";
import type { Position } from "@color-game/shared-types";
import { TangoBoardFx } from "../components/TangoBoardFx";
import {
  PLACEMENT_FX_DURATION_MS,
  SCORE_FX_DURATION_MS,
  resolveBoardFxDesign,
} from "../components/boardFxDesign";
import "./fx-lab.css";

type FxPhase = "idle" | "placement" | "complete";
type EffectMode = "placement" | "score";
type PlacementChoice = "tap" | "shadow" | "edge" | "stamp" | "leaf" | "ripple" | "ring" | "bloom" | "seal" | "fold" | "orbit" | "trinity";
type ScoreChoice = "fade" | "sweep" | "lift" | "dust" | "scatter" | "wash" | "glint" | "dissolve" | "ash" | "ribbon" | "cosmos-fold" | "tango-flow";
type LabTheme = "dark" | "light";
type TileSurface = "bright" | "dark" | "gradient";

const TARGET_CELLS = [11, 12, 13] as const;
const CENTER_POSITION: Position = { row: 2, col: 2 };
const EMPTY_SCORING_CELLS = new Set<string>();
const LAB_SCORING_CELLS = new Set(["2:1", "2:2", "2:3"]);

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

const scoreOptions: Array<{
  id: ScoreChoice;
  rarity: string;
  name: string;
  description: string;
  colors: readonly string[];
}> = [
  { id: "fade", rarity: "COMMON", name: "메이플 페이드", description: "따뜻한 결이 연결된 타일을 안쪽으로 가라앉혀 정리합니다.", colors: ["#d9a45d"] },
  { id: "sweep", rarity: "COMMON", name: "월넛 스윕", description: "월넛 스캔이 연결의 시작부터 끝까지 한 번에 훑습니다.", colors: ["#765038"] },
  { id: "lift", rarity: "COMMON", name: "아이보리 리프트", description: "아이보리 하부광이 순서대로 타일을 들어 올립니다.", colors: ["#eadbbd"] },
  { id: "dust", rarity: "COMMON", name: "차콜 더스트", description: "타일의 실루엣이 절제된 차콜 입자로 부서집니다.", colors: ["#59544d"] },
  { id: "scatter", rarity: "RARE", name: "포레스트 스캐터", description: "연결선을 따라 자란 잎맥이 가장자리로 흩어집니다.", colors: ["#7e9b63", "#c7d59b"] },
  { id: "wash", rarity: "RARE", name: "코스탈 워시", description: "넓은 물결과 굴절광이 연결된 타일을 통과합니다.", colors: ["#53b9b5", "#9be2db"] },
  { id: "glint", rarity: "RARE", name: "브라스 글린트", description: "황동 연결선 위로 연마된 빛이 빠르게 이동합니다.", colors: ["#d1a24f", "#fff0b8"] },
  { id: "dissolve", rarity: "EPIC", name: "문라이트 디졸브", description: "달빛 후광과 별가루가 타일을 위로 해체합니다.", colors: ["#b8c6ed", "#7885c6"] },
  { id: "ash", rarity: "EPIC", name: "엠버 애시", description: "가느다란 균열이 빛난 뒤 불씨와 재가 떠오릅니다.", colors: ["#f08b45", "#7b3329"] },
  { id: "ribbon", rarity: "EPIC", name: "프리즘 리본", description: "세 투명 리본이 연결선을 따라 엮여 하나로 모입니다.", colors: ["#d84d63", "#36a173", "#4d6ed7"] },
  { id: "cosmos-fold", rarity: "LEGENDARY", name: "코스모스 폴드", description: "별자리 연결이 중심으로 접히며 우주광을 남깁니다.", colors: ["#8b7de4", "#56d2ca"] },
  { id: "tango-flow", rarity: "LEGENDARY", name: "Tango 컬러 플로우", description: "세 색의 흐름이 합쳐져 Tango 마크를 완성합니다.", colors: ["#d84d63", "#36a173", "#4d6ed7"] },
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
  const [score, setScore] = useState<ScoreChoice>("fade");
  const [effectMode, setEffectMode] = useState<EffectMode>("placement");
  const [labTheme, setLabTheme] = useState<LabTheme>("dark");
  const [tileSurface, setTileSurface] = useState<TileSurface>("gradient");
  const [phase, setPhase] = useState<FxPhase>("idle");
  const [lastPlaced, setLastPlaced] = useState<Position | null>(null);
  const [scoringCells, setScoringCells] = useState<Set<string>>(EMPTY_SCORING_CELLS);
  const [playbackId, setPlaybackId] = useState(0);
  const playing = phase === "placement";
  const copy = phaseCopy[phase];
  const placementOption = placementOptions.find((option) => option.id === placement)!;
  const scoreOption = scoreOptions.find((option) => option.id === score)!;
  const placementDesign = resolveBoardFxDesign(placement, undefined).placement;

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const play = (nextChoice: PlacementChoice | ScoreChoice = effectMode === "placement" ? placement : score, revealBoard = true) => {
    if (playing) return;
    clearTimers();
    const isPlacement = effectMode === "placement";
    const nextPlacementDesign = resolveBoardFxDesign(nextChoice, undefined).placement;
    const nextScoreDesign = resolveBoardFxDesign(undefined, nextChoice).score;
    const nextDuration = isPlacement
      ? PLACEMENT_FX_DURATION_MS[nextPlacementDesign]
      : SCORE_FX_DURATION_MS[nextScoreDesign];
    if (isPlacement) setPlacement(nextChoice as PlacementChoice);
    else setScore(nextChoice as ScoreChoice);
    setLastPlaced(null);
    setScoringCells(EMPTY_SCORING_CELLS);
    setPlaybackId((value) => value + 1);
    setPhase("placement");
    if (revealBoard && window.matchMedia("(max-width: 900px)").matches) {
      boardWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    timersRef.current.push(window.setTimeout(() => {
      if (isPlacement) setLastPlaced(CENTER_POSITION);
      else setScoringCells(LAB_SCORING_CELLS);
    }, revealBoard ? 360 : 40));
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
          <p className="fx-lab-kicker">{effectMode === "placement" ? "PLACEMENT" : "SCORING"} EFFECT COLLECTION · 12</p>
          <h1>{effectMode === "placement" ? "배치 효과" : "득점 효과"}</h1>
          <p className="fx-lab-lead">{effectMode === "placement" ? "상품 이름과 재질에서 출발한 12개의 고유 동작입니다. 모든 연출은 셀 경계를 넘지 않고, 한 수가 안착하는 감각에 집중합니다." : "연결 방향과 재질을 읽을 수 있는 12개의 고유 득점 연출입니다. 배치와 분리된 두 번째 박자로 재생됩니다."}</p>

          <div className="fx-lab-mode-switch" aria-label="효과 종류">
            <button type="button" className={effectMode === "placement" ? "active" : ""} onClick={() => { setEffectMode("placement"); setPhase("idle"); }}>배치 효과</button>
            <button type="button" className={effectMode === "score" ? "active" : ""} onClick={() => { setEffectMode("score"); setPhase("idle"); }}>득점 효과</button>
          </div>

          <fieldset className="fx-lab-picker">
            <legend>{effectMode === "placement" ? "배치 효과" : "득점 효과"}</legend>
            {(effectMode === "placement" ? placementOptions : scoreOptions).map((option) => (
              <button
                className={(effectMode === "placement" ? placement : score) === option.id ? "active" : ""}
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
                const scoreTile = effectMode === "score" && TARGET_CELLS.includes(index as typeof TARGET_CELLS[number]);
                const tile = centerTile || scoreTile ? "b" : initialTiles[index];
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
              scoringCells={scoringCells}
              placementPreset={placement}
              scorePreset={score}
              placementColors={placementOption.colors}
              scoreColors={scoreOption.colors}
              motionStyle="refined"
              placementSequenceKey={playbackId}
              scoreSequenceKey={playbackId}
            />
            <span className="fx-lab-board-glow" aria-hidden="true" />
          </div>
          <div className="fx-lab-selection-summary">
            <span><b>{effectMode === "placement" ? "배치" : "득점"}</b>{effectMode === "placement" ? placementOption.name : scoreOption.name}</span>
            <i aria-hidden="true" />
            <span><b>등급</b>{effectMode === "placement" ? placementOption.rarity : scoreOption.rarity}</span>
            <i aria-hidden="true" />
            <span><b>경계</b>셀 내부 고정</span>
          </div>
        </div>
      </section>
    </main>
  );
}
