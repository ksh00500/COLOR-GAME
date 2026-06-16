import { useEffect, useId, useState } from "react";

const tutorialKey = "color-line-tutorial-complete-v1";

const tutorialSteps = [
  {
    title: "빈칸에 색을 놓기",
    body: "내 차례에는 세 가지 공용 색상 중 하나를 고르고 5×5 보드의 빈칸에 둡니다.",
  },
  {
    title: "3개 이상 연결하기",
    body: "가로, 세로, 대각선으로 같은 색 3개 이상을 완성하면 점수를 얻고 해당 타일이 제거됩니다.",
  },
  {
    title: "상대 수 이어받기",
    body: "상대가 남긴 패턴도 내 수로 완성할 수 있습니다. 상대 턴이 끝나면 알림 효과가 내 차례를 알려줍니다.",
  },
  {
    title: "목표 점수 먼저 달성",
    body: "10점을 먼저 만들면 승리합니다. 보드가 꽉 차면 흔들림 후 타일이 비워지고 대전은 계속됩니다.",
  },
] as const;

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

  if (!open) return null;

  return (
    <div className="modal-backdrop tutorial-backdrop" role="presentation">
      <section className="tutorial-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <p className="eyebrow">FIRST GUIDE</p>
        <h2 id={titleId}>처음 한 판을 위한 빠른 안내</h2>
        <div className="tutorial-card" aria-live="polite">
          <span className="tutorial-count">{String(stepIndex + 1).padStart(2, "0")}</span>
          <strong>{step.title}</strong>
          <p>{step.body}</p>
        </div>
        <div className="tutorial-dots" aria-label="튜토리얼 진행도">
          {tutorialSteps.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={index === stepIndex ? "active" : ""}
              aria-label={`${index + 1}단계로 이동`}
              onClick={() => setStepIndex(index)}
            />
          ))}
        </div>
        <div className="tutorial-actions">
          <button className="secondary-action" type="button" onClick={close}>
            건너뛰기
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
            {isLastStep ? "시작하기" : "다음"} <span aria-hidden="true">↗</span>
          </button>
        </div>
        <p className="tutorial-note">나중에는 게임 화면의 규칙 버튼에서 핵심 규칙을 다시 볼 수 있습니다.</p>
      </section>
    </div>
  );
}
