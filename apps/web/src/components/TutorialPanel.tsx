import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "../i18n";

const tutorialKey = "color-line-tutorial-complete-v4";
const tutorialOpenEvent = "color-line:open-tutorial";

export const openTutorial = () => {
  window.dispatchEvent(new Event(tutorialOpenEvent));
};

const tutorialSteps = [
  {
    title: "세 색상은 모두 공용입니다",
    body: "이 게임에는 내 색과 상대 색이 따로 없습니다. 빨강, 파랑, 초록은 양쪽 플레이어가 모두 사용할 수 있어요.",
    preview: "shared",
    points: ["상대가 둔 색도 내가 이어서 점수를 낼 수 있습니다.", "색을 고르는 순간부터 상대의 흐름까지 같이 보세요."],
    score: "0/7",
  },
  {
    title: "점수는 마지막 한 수가 가져갑니다",
    body: "이미 놓인 타일이 누구 것이었는지는 중요하지 않습니다. 연결을 완성하는 마지막 한 수를 둔 플레이어가 점수를 얻습니다.",
    preview: "lastMove",
    points: ["상대가 빨강 2개를 만들어도, 내가 빨강을 하나 더 놓아 3개를 만들면 내가 1점입니다."],
    score: "1/7",
  },
  {
    title: "가로, 세로, 대각선을 연결하세요",
    body: "같은 색을 가로, 세로, 대각선 중 한 방향으로 3개 이상 연결하면 점수가 납니다.",
    preview: "directions",
    points: ["3개 연결은 1점, 4개 연결은 2점, 5개 연결은 4점입니다."],
    score: "3=1 · 4=2 · 5=4",
  },
  {
    title: "한 수로 여러 방향을 동시에 만들 수 있습니다",
    body: "방금 둔 타일 하나가 가로와 세로, 또는 대각선까지 동시에 완성하면 각 방향의 점수를 모두 받습니다.",
    preview: "multi",
    points: ["예를 들어 가로 3개와 세로 3개를 한 번에 만들면 1점 + 1점 = 2점입니다."],
    score: "+2",
  },
  {
    title: "득점에 사용된 타일은 사라집니다",
    body: "점수에 사용된 타일은 보드에서 제거됩니다. 위에 있던 타일이 떨어지는 중력이나 자동 연쇄 콤보는 없습니다.",
    preview: "remove",
    points: ["사라진 빈칸은 다음 턴부터 다시 사용할 수 있습니다."],
    score: "CLEAR",
  },
  {
    title: "보드가 꽉 차면 마지막 색이 정리됩니다",
    body: "아무도 점수를 내지 못한 채 보드가 꽉 차면, 마지막에 둔 색과 같은 타일만 사라집니다.",
    preview: "full",
    points: ["마지막으로 파랑을 뒀다면 보드 위의 파랑 타일들이 제거되고 게임이 계속됩니다."],
    score: "FULL",
  },
  {
    title: "먼저 7점을 만들면 승리합니다",
    body: "상대가 만든 흐름을 읽고 마지막 한 수를 가져가세요. 먼저 7점에 도달하는 플레이어가 승리합니다.",
    preview: "win",
    points: ["상대의 색까지 내 전략이 되는 순간, Tango가 시작됩니다."],
    score: "7/7",
  },
] as const;

type TutorialPreview = (typeof tutorialSteps)[number]["preview"];

const tutorialCellClass = (index: number, preview: TutorialPreview) => {
  const classes = ["tutorial-preview-cell"];
  const addColor = (color: "red-tile" | "blue-tile" | "green-tile", cells: number[]) => {
    if (cells.includes(index)) classes.push(color);
  };

  if (preview === "shared") {
    addColor("red-tile", [6, 7]);
    addColor("blue-tile", [12]);
    addColor("green-tile", [18]);
  }
  if (preview === "lastMove") {
    addColor("red-tile", [6, 7, 8]);
    if (index === 8) classes.push("placing", "scoring");
  }
  if (preview === "directions") {
    addColor("red-tile", [5, 10, 15]);
    addColor("blue-tile", [11, 12, 13, 14]);
    addColor("green-tile", [4, 8, 16, 20]);
    if ([10, 12, 16].includes(index)) classes.push("scoring");
  }
  if (preview === "multi") {
    addColor("red-tile", [2, 7, 10, 11, 12, 13, 14, 17, 22]);
    if (index === 12) classes.push("placing", "scoring");
  }
  if (preview === "remove") {
    addColor("red-tile", [6, 7, 8]);
    if ([6, 7, 8].includes(index)) classes.push("scoring", "clearing");
  }
  if (preview === "full") {
    addColor("red-tile", [0, 3, 5, 8, 11, 14, 16, 19, 22]);
    addColor("blue-tile", [1, 4, 6, 9, 12, 17, 20, 23]);
    addColor("green-tile", [2, 7, 10, 13, 15, 18, 21, 24]);
  }
  if (preview === "win") {
    addColor("green-tile", [6, 7, 8, 13, 18]);
    if ([6, 7, 8].includes(index)) classes.push("scoring");
  }

  return classes.join(" ");
};

const tutorialFullBeforeCellClass = (index: number) => {
  const classes = ["tutorial-preview-cell"];
  const emptyCell = 12;
  const redCells = [0, 3, 5, 8, 11, 14, 16, 19, 22];
  const greenCells = [2, 7, 10, 13, 15, 18, 21, 24];

  if (index === emptyCell) {
    classes.push("blue-tile", "placing");
    return classes.join(" ");
  }
  if (redCells.includes(index)) classes.push("red-tile");
  else if (greenCells.includes(index)) classes.push("green-tile");
  else classes.push("blue-tile");

  return classes.join(" ");
};

const tutorialFullAfterCellClass = (index: number) => {
  const classes = ["tutorial-preview-cell"];
  const addColor = (color: "red-tile" | "green-tile", cells: number[]) => {
    if (cells.includes(index)) classes.push(color);
  };
  addColor("red-tile", [0, 3, 5, 8, 11, 14, 16, 19, 22]);
  addColor("green-tile", [2, 7, 10, 13, 15, 18, 21, 24]);
  if ([1, 4, 6, 9, 12, 17, 20, 23].includes(index)) classes.push("full-cleared");
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
              <strong>{t("예시")} {stepIndex + 1}</strong>
            </div>
            <div className="tutorial-preview-body">
              {step.preview === "full" ? (
                <div className="tutorial-preview-compare">
                  <div>
                    <span>{t("가득 차기 직전")}</span>
                    <div className="tutorial-preview-board mini before-full">
                      {Array.from({ length: 25 }, (_, index) => (
                        <i key={index} className={tutorialFullBeforeCellClass(index)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span>{t("마지막 색 제거 후")}</span>
                    <div className="tutorial-preview-board mini">
                      {Array.from({ length: 25 }, (_, index) => (
                        <i key={index} className={tutorialFullAfterCellClass(index)} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="tutorial-preview-board">
                  {Array.from({ length: 25 }, (_, index) => (
                    <i key={index} className={tutorialCellClass(index, step.preview)} />
                  ))}
                </div>
              )}
              <div className="tutorial-preview-side">
                <span className="tutorial-preview-status">{step.preview === "win" ? t("승리 조건") : t("예시 상황")}</span>
                <span className="tutorial-preview-choice">
                  <i />
                  <b>{step.preview === "shared" ? t("공용 색상") : t("마지막 한 수")}</b>
                </span>
                <span className="tutorial-preview-score">
                  <strong>{step.score}</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="tutorial-card" aria-live="polite">
            <span className="tutorial-count">{String(stepIndex + 1).padStart(2, "0")}</span>
            <strong>{t(step.title)}</strong>
            <p>{t(step.body)}</p>
            <ul className="tutorial-example-list">
              {step.points.map((point) => (
                <li key={point}>{t(point)}</li>
              ))}
            </ul>
            {step.preview === "directions" && (
              <div className="tutorial-score-table compact" aria-label={t("연결 점수")}>
                <span><i>3</i><b>{t("{points}점", { points: 1 })}</b></span>
                <span><i>4</i><b>{t("{points}점", { points: 2 })}</b></span>
                <span><i>5</i><b>{t("{points}점", { points: 4 })}</b></span>
              </div>
            )}
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
