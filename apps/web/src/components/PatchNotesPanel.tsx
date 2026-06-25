import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "../i18n";

const patchNotesKey = "tango-patch-notes-seen-2026-06-25";
const patchNotesOpenEvent = "tango:open-patch-notes";

export const openPatchNotes = () => {
  window.dispatchEvent(new Event(patchNotesOpenEvent));
};

const patchNotes = [
  {
    tag: "GUIDE",
    title: "튜토리얼 개편",
    body: "규칙 요약과 점수 구조를 먼저 보여주고, 첫 게임에서는 클릭하면 사라지는 코치마크로 핵심 조작을 안내합니다.",
  },
  {
    tag: "AI",
    title: "AI 난이도 재정리",
    body: "Easy는 더 편하게 이길 수 있도록 낮추고, 기존 Hard 학습 모델은 Normal로 이동했습니다. Hard는 다음 모델까지 잠금 상태입니다.",
  },
  {
    tag: "ACCOUNT",
    title: "로그인 접근성 개선",
    body: "메인 화면에서 로그인과 계정 진입이 더 잘 보이도록 계정 카드를 추가했습니다.",
  },
  {
    tag: "SYSTEM",
    title: "동시 로그인 방지",
    body: "같은 계정은 마지막 로그인만 유지되며, 이전 탭과 기기의 세션은 자동으로 만료됩니다.",
  },
] as const;

const hasSeenPatchNotes = () => {
  try {
    return window.localStorage.getItem(patchNotesKey) === "true";
  } catch {
    return true;
  }
};

const markSeenPatchNotes = () => {
  try {
    window.localStorage.setItem(patchNotesKey, "true");
  } catch {
    // Patch notes are informational, so storage failures are non-fatal.
  }
};

export function PatchNotesPanel() {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const { t } = useI18n();
  const [open, setOpen] = useState(() => !hasSeenPatchNotes());

  const close = () => {
    markSeenPatchNotes();
    setOpen(false);
  };

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener(patchNotesOpenEvent, reopen);
    return () => window.removeEventListener(patchNotesOpenEvent, reopen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop patch-notes-backdrop" role="presentation" onMouseDown={close}>
      <section
        ref={dialogRef}
        className="patch-notes-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PATCH NOTES</p>
            <h2 id={titleId}>{t("새로운 변경사항")}</h2>
          </div>
          <button className="icon-button" type="button" onClick={close} aria-label={t("패치노트 닫기")}>×</button>
        </div>
        <p className="patch-notes-summary">{t("이번 패치에서는 안내 흐름, AI 난이도, 로그인 접근성을 정리했습니다.")}</p>
        <ol className="patch-note-list">
          {patchNotes.map((note, index) => (
            <li key={note.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <small>{note.tag}</small>
                <strong>{t(note.title)}</strong>
                <p>{t(note.body)}</p>
              </div>
            </li>
          ))}
        </ol>
        <button className="primary-action patch-notes-confirm" type="button" onClick={close}>
          {t("확인했어요")} <span aria-hidden="true">↗</span>
        </button>
      </section>
    </div>
  );
}
