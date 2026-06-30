import type { CSSProperties } from "react";
import type { TileLoadoutSlot } from "../api";
import { cosmeticBackground, type CosmeticVisual } from "../cosmetics";

const defaultBackgrounds: Record<TileLoadoutSlot, string> = {
  colorA: "linear-gradient(145deg, var(--burgundy-light), var(--burgundy))",
  colorB: "linear-gradient(145deg, var(--navy-light), var(--navy))",
  colorC: "linear-gradient(145deg, var(--green-light), var(--green))",
};

export function TileSkinPreview({
  item,
  defaultSlot,
  className = "",
  label,
}: {
  item?: CosmeticVisual;
  defaultSlot?: TileLoadoutSlot;
  className?: string;
  label?: string;
}) {
  const background = item
    ? cosmeticBackground(item)
    : defaultBackgrounds[defaultSlot ?? "colorA"];
  return (
    <span
      className={`tile-skin-preview ${className}`.trim()}
      style={{ "--tile-skin-background": background } as CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="tile-skin-preview-fill" aria-hidden="true">
        <i />
      </span>
    </span>
  );
}
