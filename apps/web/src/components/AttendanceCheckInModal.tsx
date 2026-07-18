import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  authChangedEvent,
  claimEconomyQuest,
  fetchEconomy,
  getAuthToken,
  type EconomyOverview,
} from "../api";
import { useI18n } from "../i18n";

type AttendanceState = {
  economy: EconomyOverview;
  claimed: boolean;
};

const attendanceReward = (economy: EconomyOverview) =>
  economy.quests.find((quest) => quest.key === "attendance");

export function AttendanceCheckInModal() {
  const { t, formatNumber } = useI18n();
  const [attendance, setAttendance] = useState<AttendanceState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (getAuthToken() === null) {
      setAttendance(null);
      return;
    }

    try {
      const economy = await fetchEconomy({ force: true });
      const reward = attendanceReward(economy);
      if (reward?.claimable) {
        setAttendance({ economy, claimed: false });
      } else {
        setAttendance(null);
      }
    } catch {
      // Authentication and economy errors are already handled by their pages.
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(authChangedEvent, refresh);
    return () => window.removeEventListener(authChangedEvent, refresh);
  }, [refresh]);

  const claim = async () => {
    if (attendance === null) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await claimEconomyQuest("attendance");
      setAttendance({ economy: result.economy, claimed: true });
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "보상을 받지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (attendance === null) return null;

  const reward = attendanceReward(attendance.economy);
  const weeklyCount = attendance.economy.attendance.weeklyCount;
  const projectedCount = attendance.claimed || attendance.economy.attendance.attendedToday
    ? weeklyCount
    : weeklyCount + 1;
  const progress = Math.min(7, Math.max(1, projectedCount));

  return (
    <div className="modal-backdrop attendance-backdrop" role="presentation">
      <section
        className="attendance-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-title"
      >
        <p className="eyebrow">DAILY CHECK-IN</p>
        <div className="attendance-gem" aria-hidden="true">◆</div>
        <h2 id="attendance-title">
          {t(attendance.claimed ? "출석 완료!" : "오늘의 출석 체크")}
        </h2>
        <p>
          {t(attendance.claimed
            ? "컬러 칩 {chips}개를 받았습니다."
            : "출석하고 컬러 칩을 받으세요.", {
            chips: formatNumber(reward?.rewardChips ?? 5),
          })}
        </p>
        <div className="attendance-streak">
          <span>
            <small>{t("이번 주 출석")}</small>
            <strong>{t("{count}회", { count: formatNumber(progress) })}</strong>
          </span>
          <small>{t("이번 주 {count}번째 출석 보상", { count: formatNumber(progress) })}</small>
        </div>
        <div className="attendance-week" aria-label={t("이번 주 출석 진행도")}>
          {Array.from({ length: 7 }, (_, index) => (
            <span
              key={index}
              className={index < progress ? "checked" : ""}
              aria-label={`${index + 1}`}
            >
              {index < progress ? "✓" : index + 1}
            </span>
          ))}
        </div>
        {message && <p className="online-message">{t(message)}</p>}
        {attendance.claimed ? (
          <button className="primary-action" type="button" onClick={() => setAttendance(null)}>
            {t("계속하기")}
          </button>
        ) : (
          <div className="attendance-actions">
            <button className="secondary-action" type="button" onClick={() => setAttendance(null)}>
              {t("나중에")}
            </button>
            <button className="primary-action" type="button" disabled={busy} onClick={() => void claim()}>
              {t("출석하기")} · +{formatNumber(reward?.rewardChips ?? 5)} ◆
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
