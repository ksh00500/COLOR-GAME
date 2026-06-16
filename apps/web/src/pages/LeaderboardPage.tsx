import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLeaderboard, type PublicProfile } from "../api";
import { BrandMark } from "../components/BrandMark";

export function LeaderboardPage() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PublicProfile[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchLeaderboard()
      .then(setPlayers)
      .catch((error) => setMessage(error instanceof Error ? error.message : "리더보드를 불러오지 못했습니다."));
  }, []);

  return (
    <main className="online-page">
      <header className="site-header">
        <button className="brand-button" type="button" onClick={() => navigate("/")} aria-label="메인 화면으로">
          <BrandMark />
        </button>
        <nav aria-label="리더보드 메뉴">
          <button className="header-button" type="button" onClick={() => navigate("/account")}>계정</button>
          <button className="header-button" type="button" onClick={() => navigate("/")}>로비</button>
        </nav>
      </header>

      <section className="online-shell account-shell" aria-labelledby="leaderboard-title">
        <div className="online-copy">
          <p className="eyebrow">RANKED LADDER</p>
          <h1 id="leaderboard-title">레이팅은 경쟁 게임 결과로 갱신됩니다.</h1>
          <p>상위 50명의 레이팅, 전적, 승률을 표시합니다. RDS 연결 전에는 안내 메시지가 표시됩니다.</p>
        </div>

        <div className="online-card leaderboard-card">
          {message !== null && <p className="online-message">{message}</p>}
          {players.map((player, index) => {
            const rankedGames = player.rankedWins + player.rankedLosses + player.rankedDraws;
            const winRate = rankedGames === 0 ? 0 : Math.round((player.rankedWins / rankedGames) * 100);
            return (
              <article className="leaderboard-row" key={player.id}>
                <span>{index + 1}</span>
                <b>{player.displayName}</b>
                <strong>{player.rating}</strong>
                <small>{player.rankedWins}승 {player.rankedLosses}패 · {winRate}%</small>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
