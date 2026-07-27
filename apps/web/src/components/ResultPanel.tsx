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
  const status = primaryWon ? "win" : isDraw ? "draw" : "loss";

  return (
    <div className="modal-backdrop result-backdrop tango-result-backdrop">
      <section
        className={`result-panel tango-result-card ${status}`}
        data-result-status={status}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
      >
        <header className="tango-result-verdict">
          <p className="eyebrow">{t("경기 종료")}</p>
          <span className="tango-result-status" aria-hidden="true">
            {isDraw ? "D" : primaryWon ? "W" : "L"}
          </span>
          <h2 id="result-title">{t(title)}</h2>
          <strong>{primary.nickname}</strong>
          <p>{t(reason, { name: opponent.nickname })}</p>
        </header>

        <div className="tango-result-summary">
          <header>
            <small>FINAL SCORE</small>
            <strong>{t("최종 점수")}</strong>
          </header>
          <div className="tango-result-scoreboard">
            <span className="primary-player">
              <small>{primary.nickname}</small>
              <strong>{primary.score}</strong>
            </span>
            <i aria-hidden="true">:</i>
            <span>
              <small>{opponent.nickname}</small>
              <strong>{opponent.score}</strong>
            </span>
          </div>
          <dl className="tango-result-meta">
            <div><dt>{t("전체 턴")}</dt><dd>{game.turnNumber}</dd></div>
            <div><dt>{t("게임 시간")}</dt><dd>{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}</dd></div>
          </dl>
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
        </div>
      </section>
    </div>
  );
}
