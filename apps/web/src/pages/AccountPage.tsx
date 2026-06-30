import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  checkInAttendance,
  ApiError,
  clearAuthToken,
  deleteAccount,
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
import {
  EconomyAccountPanel,
  type AccountEconomyTab,
} from "../components/EconomyAccountPanel";
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

export function AccountPage({ deletionEntry = false }: { deletionEntry?: boolean }) {
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [accountTab, setAccountTab] = useState<AccountEconomyTab>("tiles");
  const [matchesExpanded, setMatchesExpanded] = useState(false);

  useEffect(() => {
    void fetchMe()
      .then(async (storedAccount) => {
        const nextAccount = await checkInAttendance().catch(() => storedAccount);
        setAccount(nextAccount);
        await refreshAccountData(nextAccount);
        if (deletionEntry) setDeleteOpen(true);
      })
      .catch(() => undefined);
  }, [deletionEntry]);

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
      if (deletionEntry) setDeleteOpen(true);
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

  const removeAccount = async () => {
    setDeleteBusy(true);
    setMessage(null);
    try {
      await deleteAccount(deletePassword);
      setDeleteOpen(false);
      setDeletePassword("");
      setAccount(null);
      setMatches([]);
      setLeaderboardRank(null);
      setMessage("계정이 삭제되었습니다.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "계정 삭제 요청을 처리하지 못했습니다.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <main className="online-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="online-shell account-shell app-content-shell" aria-labelledby="account-title">
        <div className="online-copy">
          <p className="eyebrow">PLAYER ACCOUNT</p>
          <h1 id="account-title">{t(deletionEntry ? "Tango 계정 삭제" : account === null ? "Tango 계정" : "마이 Tango")}</h1>
          <p>{t(deletionEntry
            ? "로그인한 뒤 비밀번호를 확인하면 계정과 연결된 데이터를 삭제할 수 있습니다."
            : account === null
              ? "로그인하고 전적과 보상을 안전하게 저장하세요."
              : "전적·스킨·보상을 한곳에서 관리하세요.")}</p>
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
                <span><small>{t("무")}</small><strong>{formatNumber(account.rankedDraws)}</strong></span>
                <span><small>{t("연속 출석")}</small><strong>{t("{days}일", { days: formatNumber(account.attendanceStreak) })}</strong></span>
                <span><small>{t("최장 출석")}</small><strong>{t("{days}일", { days: formatNumber(account.longestAttendanceStreak) })}</strong></span>
              </div>
              <nav className="account-tabs" aria-label={t("마이페이지 메뉴")}>
                {([
                  ["tiles", "타일 설정"],
                  ["quests", "퀘스트·파편"],
                  ["records", "기록"],
                  ["benefits", "혜택·계정"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={accountTab === key ? "active" : ""}
                    onClick={() => setAccountTab(key)}
                  >
                    {t(label)}
                  </button>
                ))}
              </nav>

              {accountTab === "records" && (
                <section className="account-tab-section">
                  <div className="account-record-heading">
                    <h3>{t("최근 전적")}</h3>
                    <div className="record-outcome-summary" aria-label={t("경쟁전 승패무")}>
                      <span className="win"><small>{t("승")}</small><strong>{formatNumber(account.rankedWins)}</strong></span>
                      <span className="loss"><small>{t("패")}</small><strong>{formatNumber(account.rankedLosses)}</strong></span>
                      <span className="draw"><small>{t("무")}</small><strong>{formatNumber(account.rankedDraws)}</strong></span>
                    </div>
                  </div>
                  {matches.length === 0 ? (
                    <p className="online-message">{t("아직 기록된 경기가 없습니다.")}</p>
                  ) : (
                    <>
                      <div className="match-history">
                        {matches.slice(0, matchesExpanded ? matches.length : 5).map((match) => {
                          const outcomeLabel = matchOutcome(match, account.id);
                          const outcomeClass = outcomeLabel === "승리"
                            ? "win"
                            : outcomeLabel === "패배"
                              ? "loss"
                              : "draw";
                          return (
                            <article className={`match-history-${outcomeClass}`} key={match.gameId}>
                              <b className={`match-outcome-badge ${outcomeClass}`}>{t(outcomeLabel)}</b>
                              <span>
                                <b>{match.mode.toUpperCase()} · {match.opponentName}</b>
                                <small>{match.result ?? t("완료")} · TURN {match.turnNumber}</small>
                              </span>
                              <Link to={`/replay/${encodeURIComponent(match.gameId)}`}>{t("리플레이")}</Link>
                            </article>
                          );
                        })}
                      </div>
                      {matches.length > 5 && (
                        <button className="history-more-button" type="button" onClick={() => setMatchesExpanded(!matchesExpanded)}>
                          {t(matchesExpanded ? "접기" : "더보기")}
                        </button>
                      )}
                    </>
                  )}
                </section>
              )}

              <EconomyAccountPanel activeTab={accountTab} />

              {accountTab === "benefits" && (
                <section className="account-security-actions">
                  <Link className="account-policy-link" to="/privacy">{t("개인정보 처리방침")}</Link>
                  <button className="secondary-action" type="button" onClick={logout}>{t("로그아웃")}</button>
                  <button className="danger-action" type="button" onClick={() => setDeleteOpen(true)}>{t("계정 삭제")}</button>
                </section>
              )}
            </section>
          )}
        </div>
      </section>
      {deleteOpen && account !== null && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setDeleteOpen(false)}>
          <section className="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">DELETE ACCOUNT</p>
            <h2 id="delete-account-title">{t("계정을 영구 삭제할까요?")}</h2>
            <p>{t("계정, 출석 기록, 컬러 칩 원장과 보유 스킨, 연결된 경기 기록과 리플레이가 삭제되며 복구할 수 없습니다.")}</p>
            <label className="online-field">
              <span>{t("현재 비밀번호")}</span>
              <input
                value={deletePassword}
                type="password"
                autoComplete="current-password"
                onChange={(event) => setDeletePassword(event.target.value)}
              />
            </label>
            {message !== null && <p className="online-message">{t(message)}</p>}
            <div className="result-actions">
              <button className="secondary-action" type="button" onClick={() => setDeleteOpen(false)}>{t("취소")}</button>
              <button className="danger-action" type="button" disabled={deleteBusy || deletePassword.length < 8} onClick={() => void removeAccount()}>
                {t(deleteBusy ? "삭제 처리 중" : "영구 삭제")}
              </button>
            </div>
          </section>
        </div>
      )}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
