import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Position } from "@color-game/shared-types";
import type { CosmeticItem } from "../api";
import { cosmeticBackground } from "../cosmetics";
import { TileSkinPreview } from "./TileSkinPreview";
import { TangoBoardFx } from "./TangoBoardFx";
import {
  PLACEMENT_FX_DURATION_MS,
  SCORE_FX_DURATION_MS,
  resolveBoardFxDesign,
} from "./boardFxDesign";

interface CosmeticPreviewProps {
  item: CosmeticItem;
  className?: string;
  label?: string;
  actionLabel?: string;
}

const PLACEMENT_PREVIEW_POSITION: Position = { row: 0, col: 0 };
const EMPTY_SCORING_CELLS = new Set<string>();
const SCORE_PREVIEW_CELLS = new Set(["0:0", "0:1", "0:2"]);

function PreviewReplayAction({ label }: { label?: string }) {
  if (label === undefined) return null;

  return (
    <span className="preview-replay-action" aria-hidden="true">
      <span className="preview-replay-action-icon">↻</span>
      <span>{label}</span>
    </span>
  );
}

function PlacementEffectPreview({ item, actionLabel }: { item: CosmeticItem; actionLabel?: string }) {
  const boardRef = useRef<HTMLSpanElement>(null);
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(false);
  const design = resolveBoardFxDesign(item.preset ?? undefined, undefined).placement;
  const duration = PLACEMENT_FX_DURATION_MS[design];

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => setActive(false), duration + 100);
    return () => window.clearTimeout(timeout);
  }, [active, duration, run]);

  const replay = () => {
    setActive(false);
    window.requestAnimationFrame(() => {
      setRun((value) => value + 1);
      setActive(true);
    });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    replay();
  };

  return (
    <span
      className="placement-preview-stage"
      role="button"
      tabIndex={0}
      aria-label={`${item.nameKo} 효과 미리보기 재생`}
      onClick={(event) => {
        event.stopPropagation();
        replay();
      }}
      onKeyDown={onKeyDown}
    >
      <span
        ref={boardRef}
        className="placement-preview-board-grid"
        data-placement-fx-engine="modern"
      >
        <span className="placement-preview-cell" data-cell-row="0" data-cell-col="0">
          <span
            key={`${run}:${active ? "active" : "idle"}`}
            className={`placement-preview-tile${active ? " placement-tile-motion" : ""}`}
            data-placement-motion={design}
          />
        </span>
        {active && (
          <TangoBoardFx
            key={run}
            boardRef={boardRef}
            lastPlaced={PLACEMENT_PREVIEW_POSITION}
            scoringCells={EMPTY_SCORING_CELLS}
            placementPreset={item.preset ?? undefined}
            placementColors={item.colors}
            scoreColors={[]}
            motionStyle="refined"
          />
        )}
      </span>
      <PreviewReplayAction {...(actionLabel === undefined ? {} : { label: actionLabel })} />
    </span>
  );
}

function ScoreEffectPreview({ item, actionLabel }: { item: CosmeticItem; actionLabel?: string }) {
  const boardRef = useRef<HTMLSpanElement>(null);
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(false);
  const design = resolveBoardFxDesign(undefined, item.preset ?? undefined).score;
  const duration = SCORE_FX_DURATION_MS[design];

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => setActive(false), duration + 120);
    return () => window.clearTimeout(timeout);
  }, [active, duration, run]);

  const replay = () => {
    setActive(false);
    window.requestAnimationFrame(() => {
      setRun((value) => value + 1);
      setActive(true);
    });
  };

  return (
    <span
      className={`atelier-cosmetic-preview-score-stage score-preview-motif score-preview-motif-${item.preset ?? "fade"}`}
      role="button"
      tabIndex={0}
      aria-label={`${item.nameKo} 효과 미리보기 재생`}
      onClick={(event) => {
        event.stopPropagation();
        replay();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        replay();
      }}
    >
      <span ref={boardRef} className="score-preview-board" data-score-fx-engine="modern">
        {[0, 1, 2].map((col) => (
          <span className="score-preview-cell" data-cell-row="0" data-cell-col={col} key={col}>
            <i />
          </span>
        ))}
        {active && (
          <TangoBoardFx
            key={run}
            boardRef={boardRef}
            lastPlaced={null}
            scoringCells={SCORE_PREVIEW_CELLS}
            placementColors={[]}
            scorePreset={item.preset ?? undefined}
            scoreColors={item.colors}
            motionStyle="refined"
            scoreSequenceKey={run}
          />
        )}
      </span>
      <strong className={`score-preview-points${active ? " is-active" : ""}`} aria-hidden="true">+4</strong>
      <PreviewReplayAction {...(actionLabel === undefined ? {} : { label: actionLabel })} />
    </span>
  );
}

export function CosmeticPreview({ item, className = "", label, actionLabel }: CosmeticPreviewProps) {
  if (item.category === "tile_color") {
    return <TileSkinPreview item={item} className={className} {...(label === undefined ? {} : { label })} />;
  }
  const style = {
    "--cosmetic-preview-color-a": item.colors[0] ?? "#b78a56",
    "--cosmetic-preview-color-b": item.colors[1] ?? item.colors[0] ?? "#6f4d32",
    "--cosmetic-preview-color-c": item.colors[2] ?? item.colors[1] ?? "#d5b075",
    background: item.category === "board_theme" ? cosmeticBackground(item) : undefined,
  } as CSSProperties;
  return (
    <span
      className={`atelier-cosmetic-preview atelier-cosmetic-preview-${item.category} preset-${item.preset ?? "default"} rarity-${item.rarity} ${className}`}
      data-fx-language="modern"
      style={style}
      role={item.category === "placement_effect" || item.category === "score_effect" ? "group" : "img"}
      aria-label={label}
    >
      {item.category === "board_theme" && (
        <span className="atelier-cosmetic-preview-board-shell">
          <span className="preview-board-inlay" aria-hidden="true" />
          <span className="preview-board-emblem" aria-hidden="true" />
          <span className="atelier-cosmetic-preview-board-grid">
            {Array.from({ length: 25 }, (_, index) => (
              <i className={index === 6 ? "sample-a" : index === 12 ? "sample-b" : index === 18 ? "sample-c" : ""} key={index} />
            ))}
          </span>
        </span>
      )}
      {item.category === "placement_effect" && (
        <PlacementEffectPreview item={item} {...(actionLabel === undefined ? {} : { actionLabel })} />
      )}
      {item.category === "score_effect" && (
        <ScoreEffectPreview item={item} {...(actionLabel === undefined ? {} : { actionLabel })} />
      )}
      {item.category === "victory_effect" && (
        <span className="atelier-cosmetic-preview-victory">
          <span className="preview-victory-rays" aria-hidden="true" />
          <span className="preview-victory-impact" aria-hidden="true" />
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path className="victory-laurel left" d="M33 78C17 65 14 42 25 24M28 69l-12-2M23 57l-11-6M22 44l-8-10M27 33l-3-11" />
            <path className="victory-laurel right" d="M67 78c16-13 19-36 8-54M72 69l12-2M77 57l11-6M78 44l8-10M73 33l3-11" />
            <path className="victory-cup" d="M35 24h30v13c0 13-6 22-15 22s-15-9-15-22V24Zm0 6H24v7c0 8 5 13 13 15M65 30h11v7c0 8-5 13-13 15M50 59v11M38 77h24" />
            <path className="victory-star" d="m50 29 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />
          </svg>
          <b>{item.rarity === "legendary" ? "VICTORY" : "WIN"}</b>
          <span className="preview-victory-shards" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
          </span>
          <span className="preview-victory-confetti" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
          </span>
        </span>
      )}
    </span>
  );
}
