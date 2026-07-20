import type { CSSProperties } from "react";
import type { CosmeticItem } from "../api";
import { cosmeticBackground } from "../cosmetics";
import { TileSkinPreview } from "./TileSkinPreview";

interface CosmeticPreviewProps {
  item: CosmeticItem;
  className?: string;
  label?: string;
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
      className={`atelier-cosmetic-preview atelier-cosmetic-preview-${item.category} preset-${item.preset ?? "default"} ${className}`}
      style={style}
      role="img"
      aria-label={label}
    >
      {item.category === "board_theme" && (
        <span className="atelier-cosmetic-preview-board-shell">
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
        </span>
      )}
      {item.category === "score_effect" && (
        <span className="atelier-cosmetic-preview-score-stage">
          <span className="atelier-cosmetic-preview-score-row"><i /><i /><i /></span>
          <svg viewBox="0 0 120 44" aria-hidden="true">
            <path d="M13 35C35 10 78 10 106 24" />
            <path d="m99 17 9 7-10 5" />
          </svg>
          <strong>+4</strong>
        </span>
      )}
      {item.category === "victory_effect" && (
        <span className="atelier-cosmetic-preview-victory">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path className="victory-laurel left" d="M33 78C17 65 14 42 25 24M28 69l-12-2M23 57l-11-6M22 44l-8-10M27 33l-3-11" />
            <path className="victory-laurel right" d="M67 78c16-13 19-36 8-54M72 69l12-2M77 57l11-6M78 44l8-10M73 33l3-11" />
            <path className="victory-cup" d="M35 24h30v13c0 13-6 22-15 22s-15-9-15-22V24Zm0 6H24v7c0 8 5 13 13 15M65 30h11v7c0 8-5 13-13 15M50 59v11M38 77h24" />
            <path className="victory-star" d="m50 29 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />
          </svg>
          <b>WIN</b>
        </span>
      )}
    </span>
  );
}
