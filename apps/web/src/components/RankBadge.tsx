export const paletteSteps = [
  { label: "레드", name: "Red Palette", minRating: 1050, color: "#b84d69" },
  { label: "오렌지", name: "Orange Palette", minRating: 1125, color: "#d88a2d" },
  { label: "옐로", name: "Yellow Palette", minRating: 1200, color: "#e0c13c" },
  { label: "그린", name: "Green Palette", minRating: 1300, color: "#3f8a61" },
  { label: "블루", name: "Blue Palette", minRating: 1400, color: "#3d7aa8" },
  { label: "네이비", name: "Navy Palette", minRating: 1500, color: "#223a66" },
  { label: "보라", name: "Violet Palette", minRating: 1600, color: "#6c3d9b" },
] as const;

const rainbowRankLimit = 50;

const paintSpots = [
  { cx: 53, cy: 26, rx: 7.4, ry: 5.8, rotate: -12 },
  { cx: 70, cy: 26, rx: 7.6, ry: 5.7, rotate: 13 },
  { cx: 85, cy: 37, rx: 7.2, ry: 5.4, rotate: 16 },
  { cx: 78, cy: 56, rx: 7.4, ry: 5.7, rotate: -8 },
  { cx: 60, cy: 62, rx: 7.4, ry: 5.8, rotate: 7 },
  { cx: 41, cy: 58, rx: 7.6, ry: 5.8, rotate: -14 },
  { cx: 31, cy: 46, rx: 7.1, ry: 5.4, rotate: 10 },
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

  return (
    <svg
      className={`palette-tier-icon${isRainbow ? " rainbow" : ""}`}
      viewBox="0 0 112 84"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="palette-wood-shadow"
        d="M17.8 58.6C7.5 48.5 9 31.4 20.8 20.8 35.5 7.8 62.5 8.3 84.5 17.2c16.8 6.8 23.3 21.3 15 32.7-5.4 7.4-14.8 8.4-23.2 9.1-8.9.8-11.9 2.8-17.4 8.6-9.7 10.3-28.5 3.4-41.1-9Z"
      />
      <path
        className="palette-wood"
        d="M18.3 55.6C8.6 46.2 10.2 30.4 21.2 20.5 35.1 8.2 61.4 8.8 82.5 17.3c15.9 6.5 21.7 19.4 14.1 29.7-4.9 6.7-13.6 7.7-21.6 8.4-8.9.8-12.1 2.8-17.5 8.5-9.3 9.8-27.3 3.2-39.2-8.3Z"
      />
      <ellipse className="palette-highlight" cx="58" cy="20" rx="27" ry="8" />
      <circle className="palette-hole" cx="25.5" cy="36" r="8.3" />
      <circle className="palette-hole-highlight" cx="22.7" cy="32.8" r="2" />
      {paintSpots.map((spot, index) => {
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
      {isRainbow && (
        <g className="palette-rainbow-ring">
          {paletteSteps.map((step, index) => (
            <circle
              key={step.label}
              cx={24 + index * 10.3}
              cy={72}
              r="3.2"
              fill={step.color}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

export function RankBadge({
  rating,
  compact = false,
  leaderboardRank,
}: RankBadgeProps) {
  const tier = getRankTier(rating, leaderboardRank);

  return (
    <span
      className={`rank-badge palette${compact ? " compact" : ""}${tier.isRainbow ? " rainbow" : ""}`}
      aria-label={`팔레트 티어 ${tier.label}, 레이팅 ${rating}`}
      title={`팔레트 티어 ${tier.label} · ${rating}`}
    >
      <span className="rank-palette" aria-hidden="true">
        <PaletteTierIcon filledCount={tier.filledCount} isRainbow={tier.isRainbow} />
      </span>
      <span className="rank-copy">
        <strong>{tier.label}</strong>
        {!compact && <small>{tier.name}</small>}
      </span>
    </span>
  );
}
