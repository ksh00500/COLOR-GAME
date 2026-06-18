import { useEffect, useState } from "react";
import { fetchLeaderboard, type PublicProfile } from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { PaletteTierIcon, paletteSteps, rainbowRankLimit, RankBadge } from "../components/RankBadge";
import { SettingsPanel } from "../components/SettingsPanel";
import { useI18n } from "../i18n";

interface TierGuideItem {
  label: string;
  filledCount: number;
  requirement: string;
  description: string;
  isRainbow?: boolean;
}

const tierDescriptions = [
  "첫 번째 색을 채웁니다.",
  "두 번째 색을 채웁니다.",
  "세 번째 색을 채웁니다.",
  "네 번째 색을 채웁니다.",
  "다섯 번째 색을 채웁니다.",
  "여섯 번째 색을 채웁니다.",
  "일곱 색을 모두 채웁니다.",
] as const;

const tierGuide: TierGuideItem[] = [
  {
    label: "빈 팔레트",
    filledCount: 0,
    requirement: `레이팅 ${paletteSteps[0]!.minRating} 미만`,
    description: "처음 시작하면 이 상태입니다.",
  },
  ...paletteSteps.map((step, index) => ({
    label: step.label,
    filledCount: index + 1,
    requirement: `레이팅 ${step.minRating}+`,
    description: tierDescriptions[index]!,
  })),
  {
    label: "무지개",
    filledCount: paletteSteps.length,
    isRainbow: true,
    requirement: `레이팅 ${paletteSteps[paletteSteps.length - 1]!.minRating}+ · 상위 ${rainbowRankLimit}명`,
    description: "보라 완성 후 랭킹 보상입니다.",
  },
];

export function LeaderboardPage() {
  const { t, formatNumber } = useI18n();
  const [players, setPlayers] = useState<PublicProfile[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void fetchLeaderboard()
      .then(setPlayers)
      .catch((error) => setMessage(error instanceof Error ? error.message : "리더보드를 불러오지 못했습니다."));
  }, []);

  return (
    <main className="online-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="online-shell account-shell app-content-shell" aria-labelledby="leaderboard-title">
        <div className="online-copy">
          <p className="eyebrow">RANKED LADDER</p>
          <h1 id="leaderboard-title">{t("팔레트 티어와 순위를 확인하세요.")}</h1>
          <p>{t("경쟁 게임 결과로 팔레트가 채워집니다. 보라 팔레트를 완성한 상위 50명은 무지개 팔레트를 얻습니다.")}</p>
        </div>

        <section className="tier-guide-card" aria-label="팔레트 티어 구성">
          <div className="tier-guide-heading">
            <p className="eyebrow">PALETTE TIERS</p>
            <strong>{t("티어 순서")}</strong>
          </div>
          <div className="tier-guide-list">
            {tierGuide.map((tier, index) => (
              <article className="tier-guide-item" key={tier.label}>
                <span className="tier-guide-index">{index + 1}</span>
                <span className="tier-guide-icon-wrap" aria-hidden="true">
                  <PaletteTierIcon filledCount={tier.filledCount} isRainbow={tier.isRainbow ?? false} />
                </span>
                <div className="tier-guide-copy">
                  <strong>{t(tier.label)}</strong>
                  <span className="tier-requirement">{t(tier.requirement)}</span>
                  <small>{t(tier.description)}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="online-card leaderboard-card">
          {message !== null && <p className="online-message">{t(message)}</p>}
          {players.map((player, index) => {
            const rankedGames = player.rankedWins + player.rankedLosses + player.rankedDraws;
            const winRate = rankedGames === 0 ? 0 : Math.round((player.rankedWins / rankedGames) * 100);
            return (
              <article className="leaderboard-row" key={player.id}>
                <span className="leaderboard-rank">{index + 1}</span>
                <RankBadge rating={player.rating} leaderboardRank={index + 1} compact />
                <b>{player.displayName}</b>
                <strong>{formatNumber(player.rating)}</strong>
                <small>{t("{wins}승 {losses}패 · {rate}%", { wins: player.rankedWins, losses: player.rankedLosses, rate: winRate })}</small>
              </article>
            );
          })}
        </div>
      </section>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
