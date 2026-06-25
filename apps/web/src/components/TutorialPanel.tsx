import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "../i18n";

const tutorialKey = "color-line-tutorial-complete-v3";
const tutorialOpenEvent = "color-line:open-tutorial";

export const openTutorial = () => {
  window.dispatchEvent(new Event(tutorialOpenEvent));
};

const tutorialSteps = [
  {
    title: "핵심 규칙 먼저 보기",
    body: "세 색상은 공용이며, 연결을 완성한 플레이어가 점수를 얻습니다. 한 수가 여러 방향을 완성하면 점수도 함께 합산됩니다.",
    preview: "rules",
  },
  {
    title: "빈칸에 색을 놓기",
    body: "내 차례에는 세 가지 공용 색상 중 하나를 고르고 5×5 보드의 빈칸에 둡니다.",
    preview: "place",
  },
  {
    title: "3개 이상 연결하기",
    body: "가로, 세로, 대각선으로 같은 색 3개 이상을 완성하면 점수를 얻고 해당 타일이 제거됩니다.",
    preview: "score",
  },
  {
    title: "상대 수 이어받기",
    body: "상대가 남긴 패턴도 내 수로 완성할 수 있습니다. 상대 턴이 끝나면 알림 효과가 내 차례를 알려줍니다.",
    preview: "turn",
  },
  {
    title: "목표 점수 먼저 달성",
    body: "7점을 먼저 만들면 승리합니다. 득점 없이 보드가 꽉 차면 마지막에 둔 색 타일만 사라지고 대전은 계속됩니다.",
    preview: "win",
  },
] as const;

type TutorialPreview = (typeof tutorialSteps)[number]["preview"];

const tutorialCellClass = (index: number, preview: TutorialPreview) => {
  const classes = ["tutorial-preview-cell"];
  const redLine = [6, 7, 8];
  const blueLine = [12, 17];

  if (redLine.includes(index)) classes.push("red-tile");
  if (blueLine.includes(index)) classes.push("blue-tile");
  if (preview === "place" && index === 8) classes.push("placing");
  if (preview === "score" && redLine.includes(index)) classes.push("scoring");
  if (preview === "turn" && index === 18) classes.push("green-tile", "placing");
  if (preview === "win" && [6, 7, 8, 12, 17, 18].includes(index)) classes.push("clearing");
  if (preview === "rules" && [6, 7, 8, 12, 17, 22].includes(index)) classes.push(index < 9 ? "red-tile" : "blue-tile");

  return classes.join(" ");
};

const hasCompletedTutorial = () => {
  try {
    return window.localStorage.getItem(tutorialKey) === "true";
  } catch {
    return true;
  }
};

const markCompleted = () => {
  try {
    window.localStorage.setItem(tutorialKey, "true");
  } catch {
    // Ignore storage failures; the tutorial can safely appear again later.
  }
};

export function TutorialPanel() {
  const titleId = useId();
  const noteId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const { t } = useI18n();
  const [open, setOpen] = useState(() => !hasCompletedTutorial());
  const [stepIndex, setStepIndex] = useState(0);
  const step = tutorialSteps[stepIndex]!;
  const isLastStep = stepIndex === tutorialSteps.length - 1;

  const close = () => {
    markCompleted();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const reopen = () => {
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener(tutorialOpenEvent, reopen);
    return () => window.removeEventListener(tutorialOpenEvent, reopen);
  }, []);

  if (!open) return null;

  return (
    <div className="modal-backdrop tutorial-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="tutorial-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        tabIndex={-1}
      >
        <div className="tutorial-heading">
          <div>
            <p className="eyebrow">FIRST GUIDE</p>
            <h2 id={titleId}>{t("처음 한 판을 위한 빠른 안내")}</h2>
          </div>
          <button className="icon-button" type="button" onClick={close} aria-label={t("튜토리얼 닫기")}>
            ×
          </button>
        </div>
        <div className="tutorial-stage">
          <div className={`tutorial-game-preview ${step.preview}`} aria-hidden="true">
            <div className="tutorial-preview-topbar">
              <span>AI MATCH</span>
              <strong>TURN {step.preview === "win" ? "8" : stepIndex + 1}</strong>
            </div>
            <div className="tutorial-preview-body">
              <div className="tutorial-preview-board">
                {Array.from({ length: 25 }, (_, index) => (
                  <i key={index} className={tutorialCellClass(index, step.preview)} />
                ))}
              </div>
              <div className="tutorial-preview-side">
                <span className="tutorial-preview-status">{step.preview === "turn" ? t("내 차례") : t("플레이 중")}</span>
                <span className="tutorial-preview-choice">
                  <i />
                  <b>{t("색 선택")}</b>
                </span>
                <span className="tutorial-preview-score">
                  <strong>{step.preview === "win" ? "7" : step.preview === "score" ? "1" : "0"}</strong>/7
                </span>
              </div>
            </div>
          </div>
          <div className="tutorial-card" aria-live="polite">
            <span className="tutorial-count">{String(stepIndex + 1).padStart(2, "0")}</span>
            <strong>{t(step.title)}</strong>
            <p>{t(step.body)}</p>
            <ol className="tutorial-rule-summary">
              <li><span>01</span><b>{t("공용 색상")}</b><small>{t("세 색상은 양쪽 모두 자유롭게 사용합니다.")}</small></li>
              <li><span>02</span><b>{t("마지막 한 수")}</b><small>{t("연결을 완성한 플레이어가 점수를 얻습니다.")}</small></li>
              <li><span>03</span><b>{t("방향별 합산")}</b><small>{t("한 타일로 가로와 세로를 만들면 두 점수를 모두 받습니다.")}</small></li>
              <li><span>04</span><b>{t("보드 포화")}</b><small>{t("득점 없이 보드가 꽉 차면 마지막에 둔 색 타일만 사라집니다.")}</small></li>
            </ol>
            <div className="tutorial-score-table" aria-label={t("연결 점수")}>
              <span><i>3</i><b>{t("{points}점", { points: 1 })}</b></span>
              <span><i>4</i><b>{t("{points}점", { points: 2 })}</b></span>
              <span><i>5</i><b>{t("{points}점", { points: 4 })}</b></span>
            </div>
          </div>
        </div>
        <div className="tutorial-dots" aria-label={t("튜토리얼 진행도")}>
          {tutorialSteps.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={index === stepIndex ? "active" : ""}
              aria-label={t("{step}단계로 이동", { step: index + 1 })}
              onClick={() => setStepIndex(index)}
            />
          ))}
        </div>
        <div className="tutorial-actions">
          <button className="secondary-action" type="button" onClick={close}>
            {t("건너뛰기")}
          </button>
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              if (isLastStep) {
                close();
                return;
              }
              setStepIndex((current) => current + 1);
            }}
          >
            {isLastStep ? t("시작하기") : t("다음")} <span aria-hidden="true">↗</span>
          </button>
        </div>
        <p id={noteId} className="tutorial-note">{t("나중에는 게임 화면의 규칙 버튼에서 핵심 규칙을 다시 볼 수 있습니다.")}</p>
      </section>
    </div>
  );
}
