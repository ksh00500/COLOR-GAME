import type { CSSProperties } from "react";

const paletteSteps = [
  { label: "레드", name: "Red Palette", minRating: 1050, color: "#b84d69" },
  { label: "오렌지", name: "Orange Palette", minRating: 1125, color: "#d88a2d" },
  { label: "옐로", name: "Yellow Palette", minRating: 1200, color: "#e0c13c" },
  { label: "그린", name: "Green Palette", minRating: 1300, color: "#3f8a61" },
  { label: "블루", name: "Blue Palette", minRating: 1400, color: "#3d7aa8" },
  { label: "네이비", name: "Navy Palette", minRating: 1500, color: "#223a66" },
  { label: "보라", name: "Violet Palette", minRating: 1600, color: "#6c3d9b" },
] as const;

const rainbowRankLimit = 50;

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
        <span className="rank-palette-board">
          {paletteSteps.map((step, index) => (
            <i
              key={step.label}
              className={index < tier.filledCount ? "filled" : ""}
              style={{ "--paint-color": step.color } as CSSProperties}
            />
          ))}
        </span>
      </span>
      <span className="rank-copy">
        <strong>{tier.label}</strong>
        {!compact && <small>{tier.name}</small>}
      </span>
    </span>
  );
}
