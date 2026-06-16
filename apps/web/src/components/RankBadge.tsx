const rankTiers = [
  { label: "도", name: "Do", minRating: 0, sticks: 1, complete: false },
  { label: "개", name: "Gae", minRating: 1100, sticks: 2, complete: false },
  { label: "걸", name: "Geol", minRating: 1250, sticks: 3, complete: false },
  { label: "윷", name: "Yut", minRating: 1400, sticks: 4, complete: false },
  { label: "모", name: "Mo", minRating: 1600, sticks: 4, complete: true },
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
      <span className={`rank-yut${tier.complete ? " complete" : ""}`} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <i key={index} className={index < tier.sticks ? "flipped" : ""} />
        ))}
      </span>
      <span className="rank-copy">
        <strong>{tier.label}</strong>
        {!compact && <small>{tier.name}</small>}
      </span>
    </span>
  );
}
