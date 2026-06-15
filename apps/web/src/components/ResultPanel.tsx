import type { GameState } from "@color-game/shared-types";

interface ResultPanelProps {
  game: GameState;
  elapsedSeconds: number;
  onRematch: () => void;
  onLobby: () => void;
}

export function ResultPanel({ game, elapsedSeconds, onRematch, onLobby }: ResultPanelProps) {
  if (game.status !== "finished") return null;

  const human = game.players[0];
  const ai = game.players[1];
  const isDraw = game.result === "draw";
  const humanWon = game.winnerId === human.id;
  const title = isDraw ? "무승부" : humanWon ? "승리" : "패배";
  const reason = game.result === "timeout"
    ? humanWon ? "상대의 시간이 끝났습니다." : "제한 시간이 끝났습니다."
    : game.result === "resignation"
      ? humanWon ? "상대가 대전을 종료했습니다." : "대전을 종료했습니다."
      : isDraw
        ? "보드가 가득 찼습니다."
        : humanWon
          ? "마지막 연결이 목표 점수를 완성했습니다."
          : "AI가 목표 점수에 먼저 도달했습니다.";

  return (
    <div className="modal-backdrop result-backdrop">
      <section className={`result-panel ${humanWon ? "win" : isDraw ? "draw" : "loss"}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
        <p className="eyebrow">MATCH COMPLETE</p>
        <div className="result-emblem" aria-hidden="true"><i /><i /><i /></div>
        <h2 id="result-title">{title}</h2>
        <p>{reason}</p>
        <div className="final-score">
          <span><small>YOU</small><strong>{human.score}</strong></span>
          <i>:</i>
          <span><small>AI</small><strong>{ai.score}</strong></span>
        </div>
        <div className="result-meta">
          <span><small>전체 턴</small><strong>{game.turnNumber}</strong></span>
          <span><small>게임 시간</small><strong>{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}</strong></span>
        </div>
        <div className="result-actions">
          <button type="button" className="secondary-action" onClick={onLobby}>메인으로</button>
          <button type="button" className="primary-action" onClick={onRematch}>다시 하기 <span>↗</span></button>
        </div>
      </section>
    </div>
  );
}
