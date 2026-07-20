import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "../i18n";

const latestPatchVersion = "20260721-v1.3.1";
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
    title: "꾸미기 경험 리마스터",
    date: "2026-07-21",
    summary: "게임판과 효과의 품질을 높이고 상점, 공방, 도감과 장착 화면을 실제 서비스 수준으로 다시 구성했습니다.",
    entries: [
      {
        tag: "STORE",
        title: "이번 주 상점과 팔레트 믹서",
        body: "상품을 등급별 진열 구역으로 나누고 아틀리에 상자를 안료를 섞어 결과를 발견하는 팔레트 믹서로 교체했습니다.",
      },
      {
        tag: "LOADOUT",
        title: "한눈에 보는 내 꾸미기",
        body: "타일, 게임판, 배치, 득점, 승리 연출을 한 종류씩 살펴보고 보유 항목을 누르면 즉시 적용할 수 있습니다.",
      },
      {
        tag: "EFFECT",
        title: "게임판과 효과 전면 강화",
        body: "12종 게임판에 고유 표면과 상감 표현을 더하고 배치와 득점 효과를 다층 연출로 강화했습니다.",
      },
      {
        tag: "RESULT",
        title: "새로운 경기 결과 화면",
        body: "승패와 점수, 경기 정보를 명확히 보여주는 전체 결과 장면을 만들고 승리 연출이 화면 전체에 반영되도록 개선했습니다.",
      },
    ],
  },
  {
    version: "20260719-v1.3.0",
    title: "Tango 비주얼 리마스터",
    date: "2026-07-19",
    summary: "고급 원목과 따뜻한 파치먼트 감성을 바탕으로 로고부터 게임판, 주요 화면과 모바일 내비게이션까지 새롭게 정리한 업데이트입니다.",
    entries: [
      {
        tag: "BRAND",
        title: "새로운 Tango 로고",
        body: "버건디·네이비·그린 타일이 맞물리는 새 로고를 웹, 브라우저 아이콘, Android 앱 아이콘과 시작 화면에 통일해 적용했습니다.",
      },
      {
        tag: "DESIGN",
        title: "원목과 파치먼트 디자인 시스템",
        body: "따뜻한 종이 배경과 고급 원목 게임판, 절제된 색상과 그림자로 Tango만의 캐주얼 보드게임 분위기를 만들었습니다.",
      },
      {
        tag: "LAYOUT",
        title: "보드 중심 화면 재구성",
        body: "메인과 게임 화면에서 보드와 핵심 조작을 먼저 볼 수 있도록 정보 밀도와 여백을 정리하고 상점, 마이페이지, 리더보드와 보조 화면도 같은 흐름으로 통일했습니다.",
      },
      {
        tag: "MOBILE",
        title: "모바일 내비게이션과 반응형 개선",
        body: "상단 메뉴와 하단 내비게이션을 화면에 안정적으로 고정하고 320px부터 넓은 데스크톱까지 버튼, 카드와 게임판이 겹치지 않도록 다듬었습니다.",
      },
    ],
  },
  {
    version: "20260719-v1.2.4",
    title: "계정과 사설방 화면 정리",
    date: "2026-07-19",
    summary: "마이페이지의 날짜와 계정 안내를 알아보기 쉽게 바꾸고 사설방 생성 화면을 간결하게 다듬은 패치입니다.",
    entries: [
      {
        tag: "ACCOUNT",
        title: "출석 날짜와 닉네임 안내 개선",
        body: "최근 출석을 KST 기준 날짜로 표시하고, 닉네임을 바꾸기 전에 14일 재변경 제한을 확인할 수 있도록 안내를 추가했습니다.",
      },
      {
        tag: "AUTH",
        title: "로그인과 계정 버튼 정리",
        body: "Google 로그인 버튼을 둥근 형태로 바꾸고 로그아웃과 계정 삭제 버튼의 높이와 위치를 맞췄습니다.",
      },
      {
        tag: "PRIVATE",
        title: "사설방 생성 화면 간소화",
        body: "방 생성에 필요하지 않은 닉네임 확인 카드와 아바타 선택을 제거했습니다. 계정 또는 게스트 정보는 자동으로 적용됩니다.",
      },
    ],
  },
  {
    version: "20260719-v1.2.3",
    title: "3색 팔레트 일괄 장착",
    date: "2026-07-19",
    summary: "보유 타일 세 개를 하나의 팔레트로 저장하고 웹과 모바일에서 한 번에 장착할 수 있도록 개선한 패치입니다.",
    entries: [
      {
        tag: "PALETTE",
        title: "사용자 팔레트 3개 저장",
        body: "기본 팔레트와 별도로 세 가지 사용자 팔레트를 저장할 수 있습니다. 기존 장착 조합은 첫 번째 팔레트로 안전하게 보존됩니다.",
      },
      {
        tag: "EQUIP",
        title: "세 타일 한 번에 장착",
        body: "빨강·파랑·초록 슬롯을 임시로 조합한 뒤 한 번에 적용할 수 있습니다. 적용 전에는 현재 게임 타일이 바뀌지 않습니다.",
      },
      {
        tag: "MOBILE",
        title: "모바일 전용 타일 선택창",
        body: "모바일에서 선택 슬롯, 검색, 등급 필터와 3열 타일 목록을 한 화면에서 편하게 사용할 수 있도록 배치를 정리했습니다.",
      },
      {
        tag: "COLOR",
        title: "구분하기 어려운 색상 안내",
        body: "최종 팔레트의 세 색을 서로 비교해 비슷한 슬롯을 정확히 표시합니다. 확인 후 원하는 조합을 그대로 장착할 수도 있습니다.",
      },
    ],
  },
  {
    version: "20260718-v1.2.2",
    title: "주간 출석과 조작감 개선",
    date: "2026-07-18",
    summary: "출석 보상을 주간 누적 방식으로 정리하고, 타일 선택·온라인 표기·Normal AI와 다국어 문구를 다듬은 패치입니다.",
    entries: [
      {
        tag: "CHECK-IN",
        title: "이번 주 출석 횟수 기준으로 변경",
        body: "연속 출석 대신 이번 주 출석 횟수를 보여주도록 바꿨습니다. 주간 출석은 일요일이 끝난 뒤 월요일 00:00 KST에 초기화됩니다.",
      },
      {
        tag: "QUEST",
        title: "주간 퀘스트 기준 정리",
        body: "주간 출석·온라인 경기·온라인 승리 퀘스트가 같은 주간 기준으로 계산되도록 정리했습니다. 미수령 보상은 그대로 유지됩니다.",
      },
      {
        tag: "CONTROL",
        title: "타일 선택과 보드 표시 개선",
        body: "기존 1·2·3 단축키에 Q·W·E 보조 단축키를 추가했습니다. 키보드 이동과 마우스 hover 표시가 겹쳐 보이던 문제도 수정했습니다.",
      },
      {
        tag: "ONLINE",
        title: "온라인 대전 플레이어 표기 수정",
        body: "로그인한 플레이어가 현재 차례 카드에서 게스트로 보이던 문제를 수정했습니다. 게스트 표기는 실제 게스트에게만 표시됩니다.",
      },
      {
        tag: "AI",
        title: "Normal AI 성향 완화",
        body: "Normal AI가 득점 차단에 지나치게 치우치지 않도록 방어 성향을 낮췄습니다. Easy처럼 무너지지는 않게 균형을 유지했습니다.",
      },
    ],
  },
  {
    version: "20260701-v1.2.1",
    title: "대전 기록과 모바일 경험 개선",
    date: "2026-07-01",
    summary: "전적 판정, 재경기, 퀘스트와 상점 경제를 바로잡고 모바일 화면과 게임 종료 흐름을 다듬은 통합 패치입니다.",
    entries: [
      {
        tag: "MATCH",
        title: "정확한 승패무와 멈추는 경기 시간",
        body: "게스트 상대 결과를 포함한 승패무 기록을 바로잡고 일반·경쟁 통계를 분리했습니다. 경기 시간은 종료 순간에 멈춥니다.",
      },
      {
        tag: "REMATCH",
        title: "일반게임 재경기와 탈주 방지",
        body: "일반게임은 두 플레이어가 동의하면 같은 상대와 재경기할 수 있습니다. 온라인 대전 중 이동할 때는 기권 확인을 거칩니다.",
      },
      {
        tag: "QUEST",
        title: "일간·주간 퀘스트",
        body: "일간 퀘스트 완료 상자와 주간 출석·경기·승리 보상을 추가하고 첫 승리 수령 상태를 수정했습니다.",
      },
      {
        tag: "ACCOUNT",
        title: "닉네임 변경과 전적 화면",
        body: "닉네임을 14일마다 변경할 수 있으며 전적을 전체·일반·경쟁으로 나눠 확인할 수 있습니다.",
      },
      {
        tag: "STORE",
        title: "상점 경제와 구매 확인",
        body: "팔레트 상자와 등급별 스킨 가격을 조정하고 구매 확인 및 쿠폰 보상 결과 화면을 추가했습니다.",
      },
      {
        tag: "UI",
        title: "모바일 가독성과 안내 개선",
        body: "화이트 모드 메뉴, 상단 바, 플레이 버튼, 튜토리얼, 패치노트와 결과 화면의 모바일 배치를 개선했습니다.",
      },
    ],
  },
  {
    version: "20260630-v1.1.2",
    title: "컬러 칩 경제와 타일 스킨",
    date: "2026-06-30",
    summary: "무료 컬러 칩 경제, 36종 타일 스킨, 출석 팝업과 웹·모바일 화면 개선을 함께 담은 패치입니다.",
    entries: [
      {
        tag: "ECONOMY",
        title: "무료 컬러 칩 경제 시작",
        body: "신규 계정, 출석, 주간 출석, 일반·경쟁전과 첫 승리 보상을 추가했습니다. 광고와 유료 상품은 정식 출시 전까지 잠금 상태로 유지됩니다.",
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
        body: "로그인하면 오늘의 출석 팝업이 열립니다. 이번 주 출석 진행도를 확인하고 컬러 칩 보상을 바로 받을 수 있습니다.",
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
