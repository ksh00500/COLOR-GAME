import { useEffect, useId } from "react";

export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="help-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">HOW TO PLAY</p>
            <h2 id={titleId}>연결을 완성하세요</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="도움말 닫기">×</button>
        </div>
        <ol className="rule-list">
          <li><strong>공용 색상</strong><span>세 색상은 양쪽 모두 자유롭게 사용합니다.</span></li>
          <li><strong>마지막 한 수</strong><span>연결을 완성한 플레이어가 점수를 얻습니다.</span></li>
          <li><strong>방향별 합산</strong><span>한 타일로 가로와 세로를 만들면 두 점수를 모두 받습니다.</span></li>
        </ol>
        <div className="score-table" aria-label="연결 점수">
          <span><i>3</i><strong>1점</strong></span>
          <span><i>4</i><strong>2점</strong></span>
          <span><i>5</i><strong>4점</strong></span>
        </div>
        <p className="help-note">득점에 사용된 타일은 제거되며, 중력과 연쇄 콤보는 없습니다.</p>
      </section>
    </div>
  );
}
