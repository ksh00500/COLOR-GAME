const rankTiers = [
  { label: "도", name: "Do", minRating: 0, throws: 1 },
  { label: "개", name: "Gae", minRating: 1100, throws: 2 },
  { label: "걸", name: "Geol", minRating: 1250, throws: 3 },
  { label: "윷", name: "Yut", minRating: 1400, throws: 4 },
  { label: "모", name: "Mo", minRating: 1600, throws: 5 },
] as const;

export const getRankTier = (rating: number) => {
  return [...rankTiers].reverse().find((tier) => rating >= tier.minRating) ?? rankTiers[0];
};

interface RankBadgeProps {
  rating: number;
  compact?: boolean;
}

export function RankBadge({ rating, compact = false }: RankBadgeProps) {
  const tier = getRankTier(rating);

  return (
    <span
      className={`rank-badge${compact ? " compact" : ""}`}
      aria-label={`티어 ${tier.label}, 레이팅 ${rating}`}
      title={`티어 ${tier.label} · ${rating}`}
    >
      <span className="rank-yut" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <i key={index} className={index < tier.throws ? "flipped" : ""} />
        ))}
      </span>
      <span className="rank-copy">
        <strong>{tier.label}</strong>
        {!compact && <small>{tier.name}</small>}
      </span>
    </span>
  );
}
