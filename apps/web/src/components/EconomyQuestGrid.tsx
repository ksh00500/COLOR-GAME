import { useState } from "react";
import {
  ApiError,
  claimEconomyQuest,
  type EconomyOverview,
} from "../api";
import { useI18n } from "../i18n";

const questLabels = {
  welcome: "신규 계정 보상",
  attendance: "오늘의 출석",
  attendance_streak: "7일 연속 출석",
  online_matches: "온라인 대전 보상",
  first_online_win: "오늘의 첫 승리",
  reward_ad: "선택형 보상 광고",
} as const;

const claimRoutes = {
  welcome: "welcome",
  attendance: "attendance",
  attendance_streak: "attendance-streak",
  first_online_win: "first-online-win",
} as const;

export function EconomyQuestGrid({
  economy,
  onEconomyChange,
  compact = false,
}: {
  economy: EconomyOverview;
  onEconomyChange: (economy: EconomyOverview) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const claim = async (quest: keyof typeof claimRoutes) => {
    setBusy(quest);
    setMessage(null);
    try {
      const result = await claimEconomyQuest(claimRoutes[quest]);
      onEconomyChange(result.economy);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "보상을 받지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className={`quest-grid ${compact ? "compact" : ""}`}>
        {economy.quests.map((quest) => {
          const canClaim = quest.key in claimRoutes;
          return (
            <article key={`${quest.key}:${quest.cycleKey}`}>
              <span>
                <strong>{t(questLabels[quest.key])}</strong>
                <small>{quest.progress}/{quest.goal} · +{quest.rewardChips} ◆</small>
              </span>
              {canClaim ? (
                <button
                  type="button"
                  disabled={!quest.claimable || busy !== null}
                  onClick={() => void claim(quest.key as keyof typeof claimRoutes)}
                >
                  {t(quest.claimed ? "완료" : quest.claimable ? "받기" : "진행 중")}
                </button>
              ) : quest.key === "reward_ad" ? (
                <b>🔒 {t("출시 예정")}</b>
              ) : (
                <b>{t(quest.claimed ? "완료" : "자동 지급")}</b>
              )}
            </article>
          );
        })}
      </div>
      {message && <p className="online-message">{t(message)}</p>}
    </>
  );
}
