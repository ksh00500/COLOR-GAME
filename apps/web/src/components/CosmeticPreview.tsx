import type { CSSProperties } from "react";
import type { CosmeticItem } from "../api";
import { cosmeticBackground } from "../cosmetics";
import { TileSkinPreview } from "./TileSkinPreview";

interface CosmeticPreviewProps {
  item: CosmeticItem;
  className?: string;
  label?: string;
}

function ScoreEffectPreview({ preset = "fade" }: { preset: string | null | undefined }) {
  const safePreset = preset || "fade";
  const particles = (count: number, className = "score-motif-particles") => (
    <span className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <i key={index} />)}
    </span>
  );

  const motif = (() => {
    switch (safePreset) {
      case "sweep":
        return (
          <>
            <span className="score-motif-sweep-track"><i /><i /><i /><i /></span>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d="M14 66h58M62 50l18 16-18 16" />
              <path className="accent" d="M18 35h45" />
            </svg>
          </>
        );
      case "lift":
        return (
          <>
            <span className="score-motif-lift-stack"><i /><i /><i /></span>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d="M50 78V22M34 39l16-17 16 17" />
              <path className="accent" d="M27 84h46" />
            </svg>
          </>
        );
      case "dust":
        return (
          <>
            <span className="score-motif-source-tile" />
            {particles(14, "score-motif-particles dust")}
          </>
        );
      case "scatter":
        return (
          <>
            <span className="score-motif-source-tile leaf-source" />
            {particles(10, "score-motif-particles leaves")}
          </>
        );
      case "wash":
        return (
          <>
            <span className="score-motif-wash-tiles"><i /><i /><i /></span>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d="M7 48c13-18 27 18 42 0s29 18 44 0" />
              <path className="accent" d="M7 65c13-18 27 18 42 0s29 18 44 0" />
              <path d="M16 30c7-7 14-7 21 0" />
            </svg>
          </>
        );
      case "glint":
        return (
          <>
            <span className="score-motif-glint-tile" />
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path className="glint-line" d="M13 82 82 13" />
              <path className="accent glint-star" d="m68 12 5 12 12 5-12 5-5 12-5-12-12-5 12-5 5-12Z" />
              <path d="m31 54 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />
            </svg>
          </>
        );
      case "dissolve":
        return (
          <>
            <span className="score-motif-moon" />
            {particles(9, "score-motif-particles starlight")}
          </>
        );
      case "ash":
        return (
          <>
            <span className="score-motif-ember-tile" />
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d="M50 84c-19 0-28-13-24-29 3-12 13-18 15-34 11 7 9 19 14 25 3-9 9-13 14-19 1 12 8 19 7 31-1 15-12 26-26 26Z" />
              <path className="accent" d="M50 77c-8 0-13-6-11-14 1-6 7-10 8-18 7 5 6 11 9 15 2-4 5-7 8-10 2 15-4 27-14 27Z" />
            </svg>
            {particles(7, "score-motif-particles embers")}
          </>
        );
      case "ribbon":
        return (
          <svg className="score-motif-ribbons" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M8 32c23-24 38 28 84 1" />
            <path className="accent" d="M8 50c26-25 43 29 84 0" />
            <path className="third" d="M8 69c31-29 47 23 84-3" />
          </svg>
        );
      case "cosmos-fold":
        return (
          <>
            <span className="score-motif-fold"><i /><i /></span>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d="m50 12 31 38-31 38-31-38 31-38Z" />
              <path className="accent" d="m50 12 2 38-2 38M19 50h62" />
            </svg>
            {particles(8, "score-motif-particles cosmos")}
          </>
        );
      case "tango-flow":
        return (
          <>
            <svg className="score-motif-flow" viewBox="0 0 100 100" aria-hidden="true">
              <path d="M7 23c30 0 30 27 56 27h28" />
              <path className="accent" d="M7 50h84" />
              <path className="third" d="M7 77c30 0 30-27 56-27h28" />
            </svg>
            <span className="score-motif-flow-core">+4</span>
          </>
        );
      case "fade":
      default:
        return (
          <>
            <span className="score-motif-fade-tiles"><i /><i /><i /><i /></span>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d="M18 78 50 46l32 32" />
              <path className="accent" d="M50 46V17M39 28l11-11 11 11" />
            </svg>
          </>
        );
    }
  })();

  return (
    <span className={`atelier-cosmetic-preview-score-stage score-preview-motif score-preview-motif-${safePreset}`}>
      <span className="score-preview-kind" aria-hidden="true">{motif}</span>
      <strong>+4</strong>
    </span>
  );
}

export function CosmeticPreview({ item, className = "", label }: CosmeticPreviewProps) {
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
      style={style}
      role="img"
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
        <span className="atelier-cosmetic-preview-effect-stage">
          <svg className="atelier-cosmetic-preview-effect-lines" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="31" />
            <circle cx="50" cy="50" r="42" />
            <path d="M50 4v13M50 83v13M4 50h13M83 50h13M18 18l9 9M73 73l9 9M82 18l-9 9M27 73l-9 9" />
          </svg>
          <span className="atelier-cosmetic-preview-tile placement-demo" />
          <span className="preview-effect-particles" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
          </span>
        </span>
      )}
      {item.category === "score_effect" && (
        <ScoreEffectPreview preset={item.preset} />
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
