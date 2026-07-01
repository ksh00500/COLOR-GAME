import { useId } from "react";
import { useI18n } from "../i18n";

export const paletteSteps = [
  { label: "레드", name: "Red Palette", minRating: 1050, color: "#b84d69" },
  { label: "오렌지", name: "Orange Palette", minRating: 1125, color: "#d88a2d" },
  { label: "옐로", name: "Yellow Palette", minRating: 1200, color: "#e0c13c" },
  { label: "그린", name: "Green Palette", minRating: 1300, color: "#3f8a61" },
  { label: "블루", name: "Blue Palette", minRating: 1400, color: "#3d7aa8" },
  { label: "네이비", name: "Navy Palette", minRating: 1500, color: "#223a66" },
  { label: "보라", name: "Violet Palette", minRating: 1600, color: "#6c3d9b" },
] as const;

export const rainbowRankLimit = 50;

export const paletteHole = { cx: 25.5, cy: 36, radius: 8.3 } as const;

export const paintSpots = [
  { cx: 59, cy: 25, rx: 5.7, ry: 4.4, rotate: -8 },
  { cx: 79, cy: 28, rx: 5.7, ry: 4.4, rotate: 6 },
  { cx: 44, cy: 38, rx: 5.6, ry: 4.3, rotate: -7 },
  { cx: 63, cy: 42, rx: 5.7, ry: 4.4, rotate: 5 },
  { cx: 87, cy: 37, rx: 5.6, ry: 4.3, rotate: 8 },
  { cx: 48, cy: 56, rx: 5.7, ry: 4.4, rotate: -6 },
  { cx: 78, cy: 52, rx: 5.7, ry: 4.4, rotate: 7 },
] as const;

export const getRankTier = (rating: number, leaderboardRank?: number | null) => {
  const filledCount = paletteSteps.filter((step) => rating >= step.minRating).length;
  const isComplete = filledCount === paletteSteps.length;
  const isRainbow =
    isComplete &&
    leaderboardRank !== undefined &&
    leaderboardRank !== null &&
    leaderboardRank > 0 &&
    leaderboardRank <= rainbowRankLimit;

  if (isRainbow) {
    return {
      label: "무지개",
      name: `Top ${rainbowRankLimit} Palette`,
      filledCount,
      isRainbow,
    };
  }

  if (filledCount === 0) {
    return {
      label: "빈 팔레트",
      name: "Blank Palette",
      filledCount,
      isRainbow,
    };
  }

  const current = paletteSteps[filledCount - 1]!;
  return {
    label: current.label,
    name: current.name,
    filledCount,
    isRainbow,
  };
};

interface RankBadgeProps {
  rating: number;
  compact?: boolean;
  leaderboardRank?: number | null;
}

interface PaletteTierIconProps {
  filledCount: number;
  isRainbow?: boolean;
}

export function PaletteTierIcon({
  filledCount,
  isRainbow = false,
}: PaletteTierIconProps) {
  const visibleCount = Math.max(0, Math.min(filledCount, paletteSteps.length));
  const rainbowGradientId = `palette-rainbow-${useId().replace(/:/g, "")}`;

  return (
    <svg
      className={`palette-tier-icon${isRainbow ? " rainbow" : ""}`}
      viewBox="0 0 112 84"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={rainbowGradientId} x1="14" y1="18" x2="100" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b84d69" />
          <stop offset="17%" stopColor="#d88a2d" />
          <stop offset="34%" stopColor="#e0c13c" />
          <stop offset="51%" stopColor="#3f8a61" />
          <stop offset="68%" stopColor="#3d7aa8" />
          <stop offset="84%" stopColor="#223a66" />
          <stop offset="100%" stopColor="#6c3d9b" />
        </linearGradient>
      </defs>
      <path
        className="palette-wood-shadow"
        d="M17.8 58.6C7.5 48.5 9 31.4 20.8 20.8 35.5 7.8 62.5 8.3 84.5 17.2c16.8 6.8 23.3 21.3 15 32.7-5.4 7.4-14.8 8.4-23.2 9.1-8.9.8-11.9 2.8-17.4 8.6-9.7 10.3-28.5 3.4-41.1-9Z"
      />
      <path
        className="palette-wood"
        style={isRainbow ? { fill: `url(#${rainbowGradientId})` } : undefined}
        d="M18.3 55.6C8.6 46.2 10.2 30.4 21.2 20.5 35.1 8.2 61.4 8.8 82.5 17.3c15.9 6.5 21.7 19.4 14.1 29.7-4.9 6.7-13.6 7.7-21.6 8.4-8.9.8-12.1 2.8-17.5 8.5-9.3 9.8-27.3 3.2-39.2-8.3Z"
      />
      {isRainbow && (
        <>
          <path
            className="palette-rainbow-sheen"
            d="M22 29.4C36.8 17.5 60.6 17.6 82 25.9c7.7 3 13 7.6 14.3 12.8-8.3-4.4-18.5-6.5-30.3-6.2-18.5.5-31.5 6.4-45.6 15.8-2.5-6.2-2.1-13.3 1.6-18.9Z"
          />
          <path
            className="palette-rainbow-depth"
            d="M19.2 53.7c10.8 9.8 27.8 15.6 36.7 6.3 5.8-6.1 9.9-8.5 19.1-9.3 8.6-.8 16.7-2.3 21.8-8.8-7.7 15.5-28.9 20.7-48 19.4-13.2-.9-23.9-3.9-29.6-7.6Z"
          />
        </>
      )}
      <ellipse className="palette-highlight" cx="58" cy="20" rx="27" ry="8" />
      <circle className="palette-hole" cx={paletteHole.cx} cy={paletteHole.cy} r={paletteHole.radius} />
      <circle className="palette-hole-highlight" cx="22.7" cy="32.8" r="2" />
      {!isRainbow && paintSpots.map((spot, index) => {
        const step = paletteSteps[index]!;
        const filled = index < visibleCount;
        return (
          <ellipse
            key={step.label}
            className={`palette-paint${filled ? " filled" : ""}`}
            cx={spot.cx}
            cy={spot.cy}
            rx={spot.rx}
            ry={spot.ry}
            fill={filled ? step.color : "transparent"}
            transform={`rotate(${spot.rotate} ${spot.cx} ${spot.cy})`}
          />
        );
      })}
    </svg>
  );
}

export function RankBadge({
  rating,
  compact = false,
  leaderboardRank,
}: RankBadgeProps) {
  const tier = getRankTier(rating, leaderboardRank);
  const { t, formatNumber } = useI18n();

  return (
    <span
      className={`rank-badge palette${compact ? " compact" : ""}${tier.isRainbow ? " rainbow" : ""}`}
      aria-label={t("팔레트 티어 {tier}, 레이팅 {rating}", { tier: t(tier.label), rating: formatNumber(rating) })}
      title={t("팔레트 티어 {tier} · {rating}", { tier: t(tier.label), rating: formatNumber(rating) })}
    >
      <span className="rank-palette" aria-hidden="true">
        <PaletteTierIcon filledCount={tier.filledCount} isRainbow={tier.isRainbow} />
      </span>
      <span className="rank-copy">
        <strong>{t(tier.label)}</strong>
        {!compact && <small>{tier.name}</small>}
      </span>
    </span>
  );
}
