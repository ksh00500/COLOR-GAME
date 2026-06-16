import { useEffect, useState } from "react";
import { fetchLeaderboard, type PublicProfile } from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { RankBadge } from "../components/RankBadge";
import { SettingsPanel } from "../components/SettingsPanel";

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
          <h1 id="leaderboard-title">팔레트는 경쟁 게임 결과로 채워집니다.</h1>
          <p>상위 50명의 레이팅, 전적, 승률을 표시합니다. 보라 팔레트를 완성한 top 50 플레이어는 무지개 팔레트를 얻습니다.</p>
        </div>

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
