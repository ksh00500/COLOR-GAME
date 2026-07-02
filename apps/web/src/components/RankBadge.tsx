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

export const getPaletteSpriteFrame = (
  filledCount: number,
  isRainbow = false,
) => {
  const index = isRainbow
    ? paletteSteps.length + 1
    : Math.max(0, Math.min(Math.trunc(filledCount), paletteSteps.length));

  return {
    index,
    column: index % 3,
    row: Math.floor(index / 3),
  };
};

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
  const frame = getPaletteSpriteFrame(filledCount, isRainbow);

  return (
    <img
      className={`palette-tier-icon palette-tier-sprite${isRainbow ? " rainbow" : ""}`}
      src={`/assets/rank-palettes/palette-tier-${frame.index}.png`}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
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
