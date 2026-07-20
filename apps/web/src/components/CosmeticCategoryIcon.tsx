import type { CraftCategory } from "../api";

interface CosmeticCategoryIconProps {
  category: CraftCategory;
  className?: string;
}

export function CosmeticCategoryIcon({ category, className = "" }: CosmeticCategoryIconProps) {
  const commonProps = {
    className: `cosmetic-category-icon ${className}`,
    viewBox: "0 0 64 64",
    "aria-hidden": true,
  } as const;

  if (category === "tile_color") {
    return (
      <svg {...commonProps}>
        <rect className="icon-fill-a" x="8" y="21" width="28" height="28" rx="9" transform="rotate(-9 22 35)" />
        <rect className="icon-fill-b" x="20" y="16" width="28" height="28" rx="9" transform="rotate(5 34 30)" />
        <rect className="icon-fill-c" x="32" y="22" width="24" height="24" rx="8" transform="rotate(9 44 34)" />
        <path className="icon-highlight" d="M25 21c5-2 10-1 14 1" />
      </svg>
    );
  }

  if (category === "board_theme") {
    return (
      <svg {...commonProps}>
        <rect className="icon-board-frame" x="8" y="8" width="48" height="48" rx="13" />
        {[18, 32, 46].flatMap((y) => [18, 32, 46].map((x) => (
          <rect className="icon-board-cell" key={`${x}-${y}`} x={x - 5} y={y - 5} width="10" height="10" rx="3" />
        )))}
        <circle className="icon-fill-a" cx="18" cy="18" r="4" />
        <circle className="icon-fill-b" cx="32" cy="32" r="4" />
        <circle className="icon-fill-c" cx="46" cy="46" r="4" />
      </svg>
    );
  }

  if (category === "placement_effect") {
    return (
      <svg {...commonProps}>
        <circle className="icon-stroke-soft" cx="32" cy="32" r="24" />
        <circle className="icon-stroke" cx="32" cy="32" r="17" />
        <rect className="icon-fill-a" x="21" y="21" width="22" height="22" rx="7" />
        <path className="icon-highlight" d="M32 5v8M32 51v8M5 32h8M51 32h8" />
      </svg>
    );
  }

  if (category === "score_effect") {
    return (
      <svg {...commonProps}>
        <rect className="icon-fill-a" x="7" y="25" width="17" height="17" rx="5" />
        <rect className="icon-fill-b" x="24" y="22" width="17" height="17" rx="5" />
        <rect className="icon-fill-c" x="41" y="18" width="16" height="16" rx="5" />
        <path className="icon-stroke" d="M13 49h38M45 11l4 4 6-7" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path className="icon-fill-a" d="M15 15h8c1 8 5 12 9 12s8-4 9-12h8v8c0 10-6 17-13 20v6h8v7H20v-7h8v-6c-7-3-13-10-13-20v-8Z" />
      <path className="icon-highlight" d="M22 13c0 12 4 20 10 20s10-8 10-20" />
      <path className="icon-stroke-soft" d="M13 19H7c0 9 4 14 12 16M51 19h6c0 9-4 14-12 16" />
    </svg>
  );
}
