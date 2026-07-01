import type { GameState } from "@color-game/shared-types";
import { useI18n } from "../i18n";

interface ResultPanelProps {
  game: GameState;
  elapsedSeconds: number;
  onRematch: () => void;
  onLobby: () => void;
  perspectivePlayerId?: string;
  rematchLabel?: string;
  showRematch?: boolean;
  rematchPending?: boolean;
  rematchSeconds?: number | null;
  lobbyLabel?: string;
}

export function ResultPanel({
  game,
  elapsedSeconds,
  onRematch,
  onLobby,
  perspectivePlayerId,
  rematchLabel = "다시 하기",
  showRematch = true,
  rematchPending = false,
  rematchSeconds = null,
  lobbyLabel = "메인으로",
}: ResultPanelProps) {
  const { t } = useI18n();
  if (game.status !== "finished") return null;

  const primary = game.players.find((player) => player.id === perspectivePlayerId) ?? game.players[0];
  const opponent = game.players.find((player) => player.id !== primary.id) ?? game.players[1];
  const isDraw = game.result === "draw";
  const primaryWon = game.winnerId === primary.id;
  const title = isDraw ? "무승부" : primaryWon ? "승리" : "패배";
  const reason = game.result === "timeout"
    ? primaryWon ? "상대의 시간이 끝났습니다." : "제한 시간이 끝났습니다."
    : game.result === "resignation"
      ? primaryWon ? "상대가 대전을 종료했습니다." : "대전을 종료했습니다."
      : isDraw
        ? "보드가 가득 찼습니다."
        : primaryWon
          ? "마지막 연결이 목표 점수를 완성했습니다."
          : "{name} 플레이어가 목표 점수에 먼저 도달했습니다.";

  return (
    <div className="modal-backdrop result-backdrop">
      <section className={`result-panel ${primaryWon ? "win" : isDraw ? "draw" : "loss"}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
        <p className="eyebrow">MATCH COMPLETE</p>
        <div className="result-status-card">
          <span className={`result-status-mark ${primaryWon ? "win" : isDraw ? "draw" : "loss"}`}>
            {isDraw ? "D" : primaryWon ? "W" : "L"}
          </span>
          <span>
            <small>{isDraw ? "DRAW" : primaryWon ? "WIN" : "LOSS"}</small>
            <strong>{primary.nickname}</strong>
          </span>
        </div>
        <h2 id="result-title">{t(title)}</h2>
        <p>{t(reason, { name: opponent.nickname })}</p>
        <div className="final-score">
          <span><small>{primary.nickname}</small><strong>{primary.score}</strong></span>
          <i>:</i>
          <span><small>{opponent.nickname}</small><strong>{opponent.score}</strong></span>
        </div>
        <div className="result-meta">
          <span><small>{t("전체 턴")}</small><strong>{game.turnNumber}</strong></span>
          <span><small>{t("게임 시간")}</small><strong>{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}</strong></span>
        </div>
        {rematchPending && (
          <p className="rematch-waiting" role="status">
            {t("상대의 재경기 동의를 기다리는 중입니다.")}
            {rematchSeconds !== null && ` ${rematchSeconds}${t("초")}`}
          </p>
        )}
        <div className={`result-actions${showRematch ? "" : " single"}`}>
          <button type="button" className="secondary-action" onClick={onLobby}>{t(lobbyLabel)}</button>
          {showRematch && (
            <button type="button" className="primary-action" disabled={rematchPending} onClick={onRematch}>
              {t(rematchPending ? "요청 완료" : rematchLabel)} <span>↗</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
