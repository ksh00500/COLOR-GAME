import type { CSSProperties } from "react";
import type { GamePlayer } from "@color-game/shared-types";
import { useI18n } from "../i18n";

interface PlayerCardProps {
  player: GamePlayer;
  active: boolean;
  targetScore: number;
  remainingSeconds: number | null;
  scoreDelta: number | null;
  descriptor: string;
}

const resolveAvatarLabel = (player: GamePlayer, descriptor: string): string => {
  if (descriptor.includes("AI") || player.id.toLowerCase().includes("ai")) return "AI";
  if (player.isGuest) return "G";

  const [firstCharacter] = [...player.nickname.trim()];
  return firstCharacter?.toLocaleUpperCase() ?? "P";
};

export function PlayerCard({
  player,
  active,
  targetScore,
  remainingSeconds,
  scoreDelta,
  descriptor,
}: PlayerCardProps) {
  const { t } = useI18n();
  const scoreProgress = Math.min(100, (player.score / targetScore) * 100);
  const timerProgress = remainingSeconds === null ? 100 : Math.min(100, (remainingSeconds / 60) * 100);
  const timerUrgency = remainingSeconds !== null && remainingSeconds <= 10;
  const avatarLabel = resolveAvatarLabel(player, descriptor);

  return (
    <article className={`player-card ${active ? "active" : ""}`} aria-current={active ? "true" : undefined}>
      <div className="player-card-status">
        <span className="connection-dot" />
        {active ? "CURRENT TURN" : "CONNECTED"}
      </div>
      <div className={`player-avatar avatar-${player.avatarId}`} aria-hidden="true">
        <span>{avatarLabel}</span>
      </div>
      <div className="player-identity">
        <strong>{player.nickname}</strong>
        <span>{descriptor}</span>
      </div>
      <div className="player-meters">
        <div
          className="score-ring"
          style={{ "--progress": `${scoreProgress}%` } as CSSProperties}
          aria-label={t("{score}/{target}점", { score: player.score, target: targetScore })}
        >
          <span><strong>{player.score}</strong><small>/{targetScore}</small></span>
        </div>
        {active && remainingSeconds !== null && (
          <div
            className={`timer-ring ${timerUrgency ? "urgent" : ""}`}
            style={{ "--timer-progress": `${timerProgress}%` } as CSSProperties}
            aria-label={t("{seconds}초 남음", { seconds: remainingSeconds })}
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
