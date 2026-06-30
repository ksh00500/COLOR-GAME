import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "../i18n";

const latestPatchVersion = "20260630-v1.1.2";
const patchNotesKey = `tango-patch-notes-seen-${latestPatchVersion}`;
const patchNotesOpenEvent = "tango:open-patch-notes";

export const openPatchNotes = (version = latestPatchVersion) => {
  window.dispatchEvent(new CustomEvent(patchNotesOpenEvent, { detail: { version } }));
};

export interface PatchNoteEntry {
  tag: string;
  title: string;
  body: string;
}

export interface PatchNoteRelease {
  version: string;
  title: string;
  date: string;
  summary: string;
  entries: PatchNoteEntry[];
}

export const patchNoteReleases: PatchNoteRelease[] = [
  {
    version: latestPatchVersion,
    title: "컬러 칩 경제와 타일 스킨",
    date: "2026-06-30",
    summary: "무료 컬러 칩 경제, 36종 타일 스킨, 출석 팝업과 웹·모바일 화면 개선을 함께 담은 패치입니다.",
    entries: [
      {
        tag: "ECONOMY",
        title: "무료 컬러 칩 경제 시작",
        body: "신규 계정, 출석, 연속 출석, 일반·경쟁전과 첫 승리 보상을 추가했습니다. 광고와 유료 상품은 정식 출시 전까지 잠금 상태로 유지됩니다.",
      },
      {
        tag: "COSMETIC",
        title: "타일 스킨 36종과 스킨 도감",
        body: "단색, 50:50 분할, 그라데이션, 고유 문양으로 구성된 타일 스킨을 추가했습니다. 상점의 스킨 도감에서 전체 목록과 수집 현황을 확인할 수 있습니다.",
      },
      {
        tag: "STORE",
        title: "주간 상점과 팔레트 상자",
        body: "매주 바뀌는 타일 상점과 등급별 파편, 팔레트 상자를 추가했습니다. 구매한 타일은 빨강·파랑·초록 슬롯에 각각 장착할 수 있습니다.",
      },
      {
        tag: "ATTENDANCE",
        title: "로그인 출석 팝업",
        body: "로그인하면 오늘의 출석 팝업이 열립니다. 7일 진행도와 연속 출석을 확인하고 컬러 칩 보상을 바로 받을 수 있습니다.",
      },
      {
        tag: "COUPON",
        title: "쿠폰 보상",
        body: "마이 Tango에서 쿠폰 코드를 등록해 컬러 칩, 팔레트 상자, 파편과 스킨 보상을 받을 수 있습니다.",
      },
      {
        tag: "UI",
        title: "웹·모바일 화면 개선",
        body: "메인, 상점, 마이페이지와 패치노트의 크기와 정렬을 다듬고, 모바일 내비게이션과 게임 모드 영역을 화면에 맞게 개선했습니다.",
      },
    ],
  },
  {
    version: "20260625-V1.1.1",
    title: "온보딩과 AI 난이도 정리",
    date: "2026-06-25",
    summary: "튜토리얼을 실제 규칙 이해 중심으로 다시 쓰고, AI 난이도와 로그인 접근성을 정리한 패치입니다.",
    entries: [
      {
        tag: "GUIDE",
        title: "튜토리얼 7단계 개편",
        body: "공용 색상, 마지막 한 수 득점, 방향별 점수, 동시 득점, 타일 제거, 보드 포화, 승리 조건을 보드 예시와 함께 순서대로 설명하도록 바꿨습니다.",
      },
      {
        tag: "GUIDE",
        title: "보드 포화 예시 보강",
        body: "보드가 꽉 찼을 때 마지막 색이 제거되는 규칙을 이해하기 쉽도록 제거 직전과 제거 후 상태를 나란히 보여줍니다.",
      },
      {
        tag: "AI",
        title: "AI 난이도 재정리",
        body: "Easy는 더 쉽게 낮추고, 기존 Hard 학습 모델을 Normal로 이동했습니다. Hard는 다음 고난도 모델 준비 전까지 잠금 상태입니다.",
      },
      {
        tag: "ACCOUNT",
        title: "메인 로그인 카드 추가",
        body: "메인 화면에서 로그인과 계정 진입이 더 잘 보이도록 계정 카드를 추가했습니다. 경쟁전, 리더보드, 출석 기록 안내도 함께 표시합니다.",
      },
      {
        tag: "SYSTEM",
        title: "동시 로그인 방지",
        body: "같은 계정은 마지막 로그인만 유지되며, 이전 탭과 기기의 세션은 자동으로 만료됩니다.",
      },
    ],
  },
];

export const latestPatchNote = patchNoteReleases[0]!;

export const findPatchNoteRelease = (version: string): PatchNoteRelease =>
  patchNoteReleases.find((release) => release.version === version) ?? latestPatchNote;

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
  const [release, setRelease] = useState<PatchNoteRelease>(latestPatchNote);

  const close = () => {
    markSeenPatchNotes();
    setOpen(false);
  };

  useEffect(() => {
    const reopen = (event: Event) => {
      const version = event instanceof CustomEvent && typeof event.detail?.version === "string"
        ? event.detail.version
        : latestPatchVersion;
      setRelease(findPatchNoteRelease(version));
      setOpen(true);
    };
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
            <h2 id={titleId}>{release.version}</h2>
          </div>
          <button className="icon-button" type="button" onClick={close} aria-label={t("패치노트 닫기")}>×</button>
        </div>
        <p className="patch-notes-summary">
          <strong>{t(release.title)}</strong>
          <span>{t(release.summary)}</span>
        </p>
        <ol className="patch-note-list">
          {release.entries.map((note, index) => (
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
