import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  authChangedEvent,
  claimEconomyQuest,
  fetchEconomy,
  fetchMe,
  getAuthToken,
  type Account,
  type EconomyOverview,
} from "../api";
import { useI18n } from "../i18n";

type AttendanceState = {
  account: Account;
  economy: EconomyOverview;
  claimed: boolean;
};

const attendanceReward = (economy: EconomyOverview) =>
  economy.quests.find((quest) => quest.key === "attendance");

const seoulDay = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const projectedStreak = (account: Account) => {
  const today = seoulDay();
  if (account.lastAttendanceDate === today) return account.attendanceStreak;
  const yesterday = new Date(`${today}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return account.lastAttendanceDate === yesterday.toISOString().slice(0, 10)
    ? account.attendanceStreak + 1
    : 1;
};

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
      const [account, economy] = await Promise.all([fetchMe(), fetchEconomy()]);
      const reward = attendanceReward(economy);
      if (reward?.claimable) {
        setAttendance({ account, economy, claimed: false });
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
      const account = result.account ?? attendance.account;
      setAttendance({ account, economy: result.economy, claimed: true });
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "보상을 받지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (attendance === null) return null;

  const reward = attendanceReward(attendance.economy);
  const streak = attendance.claimed
    ? attendance.account.attendanceStreak
    : projectedStreak(attendance.account);
  const progress = Math.max(1, ((streak || 1) - 1) % 7 + 1);

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
            <small>{t("현재 연속 출석")}</small>
            <strong>{t("{days}일", { days: formatNumber(streak) })}</strong>
          </span>
          <small>{t("7일마다 추가 20칩")}</small>
        </div>
        <div className="attendance-week" aria-label={t("7일 출석 진행도")}>
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
