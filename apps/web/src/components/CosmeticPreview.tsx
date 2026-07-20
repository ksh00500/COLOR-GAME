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
        <span className="atelier-cosmetic-preview-board-grid">
          {Array.from({ length: 25 }, (_, index) => <i key={index} />)}
        </span>
      )}
      {item.category === "placement_effect" && <span className="atelier-cosmetic-preview-tile placement-demo" />}
      {item.category === "score_effect" && (
        <span className="atelier-cosmetic-preview-score-row"><i /><i /><i /></span>
      )}
      {item.category === "victory_effect" && (
        <span className="atelier-cosmetic-preview-victory"><b>V</b><i /><i /><i /></span>
      )}
    </span>
  );
}
