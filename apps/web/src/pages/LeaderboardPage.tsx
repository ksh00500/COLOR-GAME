import { useEffect, useState } from "react";
import { fetchLeaderboard, type PublicProfile } from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { PaletteTierIcon, RankBadge } from "../components/RankBadge";
import { SettingsPanel } from "../components/SettingsPanel";

const tierGuide = [
  { label: "빈 팔레트", filledCount: 0, description: "색이 없는 시작 단계" },
  { label: "레드", filledCount: 1, description: "첫 색을 채운 티어" },
  { label: "오렌지", filledCount: 2, description: "두 번째 색상" },
  { label: "옐로", filledCount: 3, description: "세 번째 색상" },
  { label: "그린", filledCount: 4, description: "네 번째 색상" },
  { label: "블루", filledCount: 5, description: "다섯 번째 색상" },
  { label: "네이비", filledCount: 6, description: "여섯 번째 색상" },
  { label: "보라", filledCount: 7, description: "일곱 색 완성" },
  { label: "무지개", filledCount: 7, isRainbow: true, description: "보라 완성 + 상위 50명" },
] as const;

export function LeaderboardPage() {
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
          <h1 id="leaderboard-title">팔레트 티어와 순위를 확인하세요.</h1>
          <p>경쟁 게임 결과로 팔레트가 채워집니다. 보라 팔레트를 완성한 상위 50명은 무지개 팔레트를 얻습니다.</p>
        </div>

        <section className="tier-guide-card" aria-label="팔레트 티어 구성">
          <div className="tier-guide-heading">
            <p className="eyebrow">PALETTE TIERS</p>
            <strong>티어 순서</strong>
          </div>
          <div className="tier-guide-list">
            {tierGuide.map((tier, index) => (
              <article className="tier-guide-item" key={tier.label}>
                <span className="tier-guide-index">{index + 1}</span>
                <PaletteTierIcon filledCount={tier.filledCount} isRainbow={"isRainbow" in tier ? tier.isRainbow : false} />
                <div className="tier-guide-copy">
                  <strong>{tier.label}</strong>
                  <small>{tier.description}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="online-card leaderboard-card">
          {message !== null && <p className="online-message">{message}</p>}
          {players.map((player, index) => {
            const rankedGames = player.rankedWins + player.rankedLosses + player.rankedDraws;
            const winRate = rankedGames === 0 ? 0 : Math.round((player.rankedWins / rankedGames) * 100);
            return (
              <article className="leaderboard-row" key={player.id}>
                <span className="leaderboard-rank">{index + 1}</span>
                <RankBadge rating={player.rating} leaderboardRank={index + 1} compact />
                <b>{player.displayName}</b>
                <strong>{player.rating}</strong>
                <small>{player.rankedWins}승 {player.rankedLosses}패 · {winRate}%</small>
              </article>
            );
          })}
        </div>
      </section>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
