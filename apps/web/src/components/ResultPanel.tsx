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
  const victoryPreset = primaryWon && typeof document !== "undefined"
    ? document.documentElement.dataset.tangoVictoryEffect ?? "default"
    : "default";

  return (
    <div className="modal-backdrop result-backdrop result-scene-backdrop">
      <section
        className={`result-panel result-scene ${primaryWon ? "win" : isDraw ? "draw" : "loss"}`}
        data-victory-preset={victoryPreset}
        data-result-status={primaryWon ? "win" : isDraw ? "draw" : "loss"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
      >
        <div className="result-scene-art" aria-hidden="true">
          <i className="result-scene-ambient" />
          <i className="result-scene-beam beam-a" />
          <i className="result-scene-beam beam-b" />
          <i className="result-scene-ribbon" />
          {Array.from({ length: 6 }, (_, index) => <b key={index} />)}
        </div>
        <div className="result-scene-layout">
          <header className="result-presentation-stage">
            <p className="eyebrow">MATCH COMPLETE</p>
            <div className="result-victory-emblem" aria-hidden="true">
              <span className="result-emblem-orbit" />
              <svg viewBox="0 0 160 160">
                <path className="result-laurel left" d="M62 129C31 110 22 68 42 32M49 113l-24-2M39 94l-21-10M36 72 20-17M44 50 35-18" />
                <path className="result-laurel right" d="M98 129c31-19 40-61 20-97M111 113l24-2M121 94l21-10M124 72l20-17M116 50l9-18" />
                <path className="result-cup" d="M56 39h48v24c0 25-10 42-24 42S56 88 56 63V39Zm0 10H37v13c0 16 8 25 22 29M104 49h19v13c0 16-8 25-22 29M80 105v17M62 132h36" />
                <path className="result-star" d="m80 50 5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2 5-11Z" />
              </svg>
              <strong>{isDraw ? "D" : primaryWon ? "W" : "L"}</strong>
            </div>
            <div className="result-cinematic-banner">
              <i className="result-banner-wing wing-left" aria-hidden="true" />
              <div className="result-outcome-copy">
                <span>{t(primaryWon ? "오늘의 승자" : isDraw ? "경기 종료" : "다음 승부를 준비하세요")}</span>
                <h2 id="result-title">{t(title)}</h2>
                <strong>{primary.nickname}</strong>
              </div>
              <i className="result-banner-wing wing-right" aria-hidden="true" />
            </div>
            <p className="result-cinematic-reason">{t(reason, { name: opponent.nickname })}</p>
          </header>

          <aside className="result-match-card">
            <header>
              <div><small>FINAL SCORE</small><strong>{t("최종 점수")}</strong></div>
              <span>{isDraw ? "DRAW" : primaryWon ? "WIN" : "LOSE"}</span>
            </header>
            <div className="result-scoreboard">
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
            <dl className="result-match-meta">
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
          </aside>
        </div>
      </section>
    </div>
  );
}
