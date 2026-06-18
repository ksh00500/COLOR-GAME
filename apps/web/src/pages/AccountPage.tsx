import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  checkInAttendance,
  ApiError,
  clearAuthToken,
  fetchLeaderboard,
  fetchMatches,
  fetchMe,
  loginAccount,
  registerAccount,
  type Account,
  type MatchHistoryItem,
  type PublicProfile,
} from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { RankBadge } from "../components/RankBadge";
import { SettingsPanel } from "../components/SettingsPanel";
import { useI18n } from "../i18n";

type AuthMode = "login" | "register";

const matchOutcome = (match: MatchHistoryItem, accountId: string): string => {
  if (match.winnerAccountId === null) return "무승부";
  return match.winnerAccountId === accountId ? "승리" : "패배";
};

const findLeaderboardRank = (players: PublicProfile[], accountId: string): number | null => {
  const index = players.findIndex((player) => player.id === accountId);
  return index === -1 ? null : index + 1;
};

export function AccountPage() {
  const { t, formatNumber } = useI18n();
  const [mode, setMode] = useState<AuthMode>("login");
  const [account, setAccount] = useState<Account | null>(null);
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarId, setAvatarId] = useState("orbit");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  useEffect(() => {
    void fetchMe()
      .then(async (storedAccount) => {
        const nextAccount = await checkInAttendance().catch(() => storedAccount);
        setAccount(nextAccount);
        await refreshAccountData(nextAccount);
      })
      .catch(() => undefined);
  }, []);

  async function refreshAccountData(nextAccount: Account) {
    const [nextMatches, leaderboard] = await Promise.all([
      fetchMatches(nextAccount.id),
      fetchLeaderboard().catch(() => [] as PublicProfile[]),
    ]);
    setMatches(nextMatches);
    setLeaderboardRank(findLeaderboardRank(leaderboard, nextAccount.id));
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const nextAccount = mode === "login"
        ? await loginAccount({ email, password })
        : await registerAccount({ email, password, displayName, avatarId });
      const checkedInAccount = await checkInAttendance().catch(() => nextAccount);
      setAccount(checkedInAccount);
      await refreshAccountData(checkedInAccount);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "계정 요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setAccount(null);
    setMatches([]);
    setLeaderboardRank(null);
  };

  return (
    <main className="online-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="online-shell account-shell app-content-shell" aria-labelledby="account-title">
        <div className="online-copy">
          <p className="eyebrow">PLAYER ACCOUNT</p>
          <h1 id="account-title">{t("전적과 레이팅은 계정에 저장됩니다.")}</h1>
          <p>{t("경쟁 게임은 로그인한 플레이어만 참가할 수 있습니다. 계정에는 전적, 레이팅, 최근 경기 기록이 저장됩니다.")}</p>
        </div>

        <div className="online-card">
          {account === null ? (
            <form className="account-form" onSubmit={submit}>
              <div className="segmented-control two-up">
                <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>{t("로그인")}</button>
                <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>{t("회원가입")}</button>
              </div>

              <label className="online-field">
                <span>{t("이메일")}</span>
                <input value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="online-field">
                <span>{t("비밀번호")}</span>
                <input value={password} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} onChange={(event) => setPassword(event.target.value)} />
              </label>

              {mode === "register" && (
                <>
                  <label className="online-field">
                    <span>{t("닉네임")}</span>
                    <input value={displayName} maxLength={24} onChange={(event) => setDisplayName(event.target.value)} />
                  </label>
                  <fieldset>
                    <legend>{t("아바타")}</legend>
                    <div className="segmented-control two-up">
                      {(["orbit", "prism"] as const).map((avatar) => (
                        <button key={avatar} type="button" className={avatarId === avatar ? "active" : ""} onClick={() => setAvatarId(avatar)}>
                          {avatar === "orbit" ? "Orbit" : "Prism"}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              <button className="primary-action" type="submit" disabled={busy}>
                {mode === "login" ? t("로그인") : t("계정 만들기")} <span aria-hidden="true">↗</span>
              </button>
              {message !== null && <p className="online-message">{t(message)}</p>}
            </form>
          ) : (
            <section className="account-summary">
              <p className="eyebrow">SIGNED IN</p>
              <div className="account-title-row">
                <h2>{account.displayName}</h2>
                <RankBadge rating={account.rating} leaderboardRank={leaderboardRank} />
              </div>
              <div className="profile-stats">
                <span><small>{t("레이팅")}</small><strong>{formatNumber(account.rating)}</strong></span>
                <span><small>{t("경기")}</small><strong>{formatNumber(account.gamesPlayed)}</strong></span>
                <span><small>{t("승")}</small><strong>{formatNumber(account.rankedWins)}</strong></span>
                <span><small>{t("패")}</small><strong>{formatNumber(account.rankedLosses)}</strong></span>
                <span><small>{t("연속 출석")}</small><strong>{t("{days}일", { days: formatNumber(account.attendanceStreak) })}</strong></span>
                <span><small>{t("최장 출석")}</small><strong>{t("{days}일", { days: formatNumber(account.longestAttendanceStreak) })}</strong></span>
              </div>
              <button className="secondary-action" type="button" onClick={logout}>{t("로그아웃")}</button>
              <h3>{t("최근 전적")}</h3>
              {matches.length === 0 ? (
                <p className="online-message">{t("아직 기록된 경기가 없습니다.")}</p>
              ) : (
                <div className="match-history">
                  {matches.map((match) => (
                    <article key={match.gameId}>
                      <span>
                        <b>{match.mode.toUpperCase()} · {match.opponentName}</b>
                      <small>{t(matchOutcome(match, account.id))} · {match.result ?? t("완료")} · TURN {match.turnNumber}</small>
                      </span>
                      <Link to={`/replay/${encodeURIComponent(match.gameId)}`}>{t("리플레이")}</Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </section>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
