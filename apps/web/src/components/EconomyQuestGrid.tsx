import { useState } from "react";
import {
  ApiError,
  claimEconomyQuest,
  createRewardAdSession,
  fetchRewardAdSession,
  type EconomyOverview,
} from "../api";
import { useI18n } from "../i18n";
import { isNativeApp } from "../nativeApp";
import { showNativeRewardedAd } from "../rewardAds";

export const questLabels = {
  attendance: "오늘의 출석",
  online_matches: "온라인 대전 보상",
  first_online_win: "오늘의 첫 승리",
  daily_complete: "오늘의 퀘스트 완료",
  weekly_attendance: "주간 출석 5일",
  weekly_matches: "주간 온라인 20경기",
  weekly_wins: "주간 온라인 10승",
  weekly_complete: "주간 퀘스트 완료",
  reward_ad: "선택형 보상 광고",
} as const;

const claimRoutes = {
  attendance: "attendance",
  first_online_win: "first-online-win",
  daily_complete: "daily-complete",
  weekly_attendance: "weekly-attendance",
  weekly_matches: "weekly-matches",
  weekly_wins: "weekly-wins",
  weekly_complete: "weekly-complete",
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
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");

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

  const watchRewardAd = async () => {
    setBusy("reward_ad");
    setMessage(null);
    try {
      const created = await createRewardAdSession();
      const result = await showNativeRewardedAd({
        adUnitId: created.adUnitId,
        customData: created.session.customData,
        userId: created.session.userId,
      });
      if (!result.earnedReward) {
        setMessage("광고 시청을 완료하면 보상을 받을 수 있습니다.");
        return;
      }
      setMessage("광고 보상을 확인하고 있습니다.");
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1_500));
        const status = await fetchRewardAdSession(created.session.id);
        if (status.status === "verified") {
          onEconomyChange(status.economy);
          setMessage("컬러 칩 12개를 받았습니다.");
          return;
        }
        if (status.status === "expired") break;
      }
      setMessage("보상 확인이 지연되고 있습니다. 확인이 끝나면 자동으로 지급됩니다.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "광고를 불러오지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {!compact && (
        <div className="quest-period-tabs" role="tablist" aria-label={t("퀘스트 기간")}>
          <button type="button" className={period === "daily" ? "active" : ""} onClick={() => setPeriod("daily")}>{t("일간")}</button>
          <button type="button" className={period === "weekly" ? "active" : ""} onClick={() => setPeriod("weekly")}>{t("주간")}</button>
        </div>
      )}
      <div className={`quest-grid ${compact ? "compact" : ""}`}>
        {economy.quests
          .filter((quest) => compact
            ? quest.period === "daily"
            : period === "daily"
              ? quest.period === "daily" || quest.period === "once"
              : quest.period === "weekly")
          .map((quest) => {
          const canClaim = quest.key in claimRoutes;
          return (
            <article
              key={`${quest.key}:${quest.cycleKey}`}
              className={quest.key === "reward_ad" ? "quest-card-reward-ad" : undefined}
            >
              <span>
                <strong>{t(questLabels[quest.key])}</strong>
                <small>
                  {quest.progress}/{quest.goal}
                  {quest.rewardChips > 0 ? ` · +${quest.rewardChips} ◆` : ""}
                  {quest.rewardBoxTickets > 0 ? ` · +${quest.rewardBoxTickets} ${t("상자")}` : ""}
                </small>
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
                economy.monetization.rewardAds.status === "available" && isNativeApp() ? (
                  <button
                    type="button"
                    disabled={busy !== null || quest.progress >= quest.goal}
                    onClick={() => void watchRewardAd()}
                  >
                    {t(busy === "reward_ad" ? "광고 불러오는 중" : "광고 보고 받기")}
                  </button>
                ) : (
                  <b>🔒 {t("출시 예정")}</b>
                )
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
