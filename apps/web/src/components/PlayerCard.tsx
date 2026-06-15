import type { CSSProperties } from "react";
import type { GamePlayer } from "@color-game/shared-types";

interface PlayerCardProps {
  player: GamePlayer;
  active: boolean;
  targetScore: number;
  remainingSeconds: number | null;
  scoreDelta: number | null;
  descriptor: string;
}

export function PlayerCard({
  player,
  active,
  targetScore,
  remainingSeconds,
  scoreDelta,
  descriptor,
}: PlayerCardProps) {
  const scoreProgress = Math.min(100, (player.score / targetScore) * 100);
  const timerProgress = remainingSeconds === null ? 100 : Math.min(100, (remainingSeconds / 60) * 100);
  const timerUrgency = remainingSeconds !== null && remainingSeconds <= 10;

  return (
    <article className={`player-card ${active ? "active" : ""}`} aria-current={active ? "true" : undefined}>
      <div className="player-card-status">
        <span className="connection-dot" />
        {active ? "CURRENT TURN" : "CONNECTED"}
      </div>
      <div className={`player-avatar avatar-${player.avatarId}`} aria-hidden="true">
        <i /><i /><i />
      </div>
      <div className="player-identity">
        <strong>{player.nickname}</strong>
        <span>{descriptor}</span>
      </div>
      <div className="player-meters">
        <div
          className="score-ring"
          style={{ "--progress": `${scoreProgress}%` } as CSSProperties}
          aria-label={`${player.score}/${targetScore}점`}
        >
          <span><strong>{player.score}</strong><small>/{targetScore}</small></span>
        </div>
        {active && remainingSeconds !== null && (
          <div
            className={`timer-ring ${timerUrgency ? "urgent" : ""}`}
            style={{ "--timer-progress": `${timerProgress}%` } as CSSProperties}
            aria-label={`${remainingSeconds}초 남음`}
          >
            <strong>{remainingSeconds}</strong>
            <small>SEC</small>
          </div>
        )}
      </div>
      {scoreDelta !== null && scoreDelta > 0 && <span className="score-delta">+{scoreDelta}</span>}
    </article>
  );
}

