import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  checkInAttendance,
  ApiError,
  clearAuthToken,
  deleteAccount,
  fetchAuthMethods,
  getAuthToken,
  getCachedAccount,
  fetchEconomy,
  fetchLeaderboard,
  fetchMatches,
  fetchMe,
  loginAccount,
  loginWithGoogle,
  linkGoogleAccount,
  registerAccount,
  unlinkGoogleAccount,
  updateDisplayName,
  type Account,
  type AuthMethods,
  type EconomyOverview,
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
import { GoogleSignInButton } from "../components/GoogleSignInButton";

type AuthMode = "login" | "register";

export const matchModeLabels: Record<string, string> = {
  casual: "일반",
  ranked: "경쟁",
  private: "사설방",
  ai: "AI 대전",
};

export const matchResultLabels: Record<string, string> = {
  "target-score": "목표 점수 달성",
  draw: "무승부 종료",
  timeout: "제한 시간 종료",
  resignation: "기권으로 종료",
  disconnect: "연결 끊김으로 종료",
};

const findLeaderboardRank = (players: PublicProfile[], accountId: string): number | null => {
  const index = players.findIndex((player) => player.id === accountId);
  return index === -1 ? null : index + 1;
};

const statsForAccount = (
  account: Account,
  mode: "all" | "casual" | "ranked",
): { wins: number; losses: number; draws: number } => {
  const current = account.matchStats?.[mode];
  if (current !== undefined) return current;
  const ranked = {
    wins: account.rankedWins ?? 0,
    losses: account.rankedLosses ?? 0,
    draws: account.rankedDraws ?? 0,
  };
  const casual = {
    wins: account.casualWins ?? 0,
    losses: account.casualLosses ?? 0,
    draws: account.casualDraws ?? 0,
  };
  if (mode === "ranked") return ranked;
  if (mode === "casual") return casual;
  return {
    wins: ranked.wins + casual.wins,
    losses: ranked.losses + casual.losses,
    draws: ranked.draws + casual.draws,
  };
};

export function AccountPage({ deletionEntry = false }: { deletionEntry?: boolean }) {
  const { t, formatNumber } = useI18n();
  const [mode, setMode] = useState<AuthMode>("login");
  const [account, setAccount] = useState<Account | null>(
    () => getAuthToken() === null ? null : getCachedAccount(),
  );
  const [authChecking, setAuthChecking] = useState(
    () => getAuthToken() !== null && getCachedAccount() === null,
  );
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
  const [recordMode, setRecordMode] = useState<"all" | "casual" | "ranked">("all");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameBusy, setNicknameBusy] = useState(false);
  const [authMethods, setAuthMethods] = useState<AuthMethods>({ password: true, google: false });
  const [economySummary, setEconomySummary] = useState<EconomyOverview | null>(null);
  const [pendingGoogleToken, setPendingGoogleToken] = useState<string | null>(null);
  const [googleStep, setGoogleStep] = useState<"register" | "link" | null>(null);
  const [googlePassword, setGooglePassword] = useState("");
  const allMatchStats = account === null
    ? { wins: 0, losses: 0, draws: 0 }
    : statsForAccount(account, "all");

  useEffect(() => {
    if (getAuthToken() === null) {
      setAuthChecking(false);
      return;
    }

    void fetchMe({ force: true })
      .then(async (storedAccount) => {
        const nextAccount = await checkInAttendance().catch(() => storedAccount);
        setAccount(nextAccount);
        setNicknameDraft(nextAccount.displayName);
        await refreshAccountData(nextAccount);
        if (deletionEntry) setDeleteOpen(true);
      })
      .catch(() => setAccount(null))
      .finally(() => setAuthChecking(false));
  }, [deletionEntry]);

  async function refreshAccountData(nextAccount: Account) {
    const [nextMatches, leaderboard, methods, economy] = await Promise.all([
      fetchMatches(nextAccount.id),
      fetchLeaderboard().catch(() => [] as PublicProfile[]),
      fetchAuthMethods().catch(() => ({ password: true, google: false })),
      fetchEconomy({ force: true }).catch(() => null),
    ]);
    setMatches(nextMatches);
    setLeaderboardRank(findLeaderboardRank(leaderboard, nextAccount.id));
    setAuthMethods(methods);
    setEconomySummary(economy);
  }

  const acceptAccount = useCallback(async (nextAccount: Account) => {
    setAuthChecking(false);
    const checkedInAccount = await checkInAttendance().catch(() => nextAccount);
    setAccount(checkedInAccount);
    setNicknameDraft(checkedInAccount.displayName);
    setPendingGoogleToken(null);
    setGoogleStep(null);
    setGooglePassword("");
    await refreshAccountData(checkedInAccount);
    if (deletionEntry) setDeleteOpen(true);
  }, [deletionEntry]);

  const handleGoogleCredential = useCallback(async (idToken: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await acceptAccount(await loginWithGoogle({ idToken }));
    } catch (error) {
      if (error instanceof ApiError && error.code === "GOOGLE_REGISTRATION_REQUIRED") {
        const details = error.details as { suggestedDisplayName?: string };
        setPendingGoogleToken(idToken);
        setGoogleStep("register");
        setDisplayName(details.suggestedDisplayName ?? "");
      } else if (error instanceof ApiError && error.code === "GOOGLE_LINK_REQUIRED") {
        setPendingGoogleToken(idToken);
        setGoogleStep("link");
      } else {
        setMessage(error instanceof ApiError ? error.code : "GOOGLE_SIGN_IN_FAILED");
      }
    } finally {
      setBusy(false);
    }
  }, [acceptAccount]);

  const finishGoogleRegistration = async () => {
    if (pendingGoogleToken === null) return;
    setBusy(true);
    setMessage(null);
    try {
      await acceptAccount(await loginWithGoogle({
        idToken: pendingGoogleToken,
        displayName,
        avatarId,
      }));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "GOOGLE_SIGN_IN_FAILED");
    } finally {
      setBusy(false);
    }
  };

  const finishGoogleLink = async () => {
    if (pendingGoogleToken === null) return;
    setBusy(true);
    setMessage(null);
    try {
      await acceptAccount(await linkGoogleAccount({
        idToken: pendingGoogleToken,
        password: googlePassword,
      }));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "GOOGLE_SIGN_IN_FAILED");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const nextAccount = mode === "login"
        ? await loginAccount({ email, password })
        : await registerAccount({ email, password, displayName, avatarId });
      await acceptAccount(nextAccount);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "계정 요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setAuthChecking(false);
    setAccount(null);
    setMatches([]);
    setLeaderboardRank(null);
    setEconomySummary(null);
    setPendingGoogleToken(null);
    setGoogleStep(null);
  };

  const removeAccount = async () => {
    setDeleteBusy(true);
    setMessage(null);
    try {
      await deleteAccount(authMethods.password
        ? { password: deletePassword }
        : { confirmation: "DELETE" });
      setDeleteOpen(false);
      setDeletePassword("");
      setAccount(null);
      setMatches([]);
      setLeaderboardRank(null);
      setEconomySummary(null);
      setMessage("계정이 삭제되었습니다.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "계정 삭제 요청을 처리하지 못했습니다.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const changeNickname = async () => {
    setNicknameBusy(true);
    setMessage(null);
    try {
      const updated = await updateDisplayName(nicknameDraft);
      setAccount(updated);
      setNicknameDraft(updated.displayName);
      setMessage("닉네임을 변경했습니다.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "닉네임을 변경하지 못했습니다.");
    } finally {
      setNicknameBusy(false);
    }
  };

  return (
    <main className="online-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="online-shell account-shell app-content-shell" aria-labelledby="account-title">
        <div className="online-copy">
          <p className="eyebrow">PLAYER ACCOUNT</p>
          <h1 id="account-title">{t(deletionEntry ? "Tango 계정 삭제" : authChecking || account !== null ? "마이 페이지" : "Tango 계정")}</h1>
          <p>{t(deletionEntry
            ? "로그인한 뒤 비밀번호를 확인하면 계정과 연결된 데이터를 삭제할 수 있습니다."
            : !authChecking && account === null
              ? "로그인하고 전적과 보상을 안전하게 저장하세요."
              : "전적·스킨·보상을 한곳에서 관리하세요.")}</p>
        </div>

        <div className="online-card">
          {authChecking ? (
            <section className="route-loading account-route-loading" aria-label={t("계정 정보를 불러오는 중입니다.")} aria-busy="true">
              <span className="route-loading-title" />
              <span className="route-loading-line" />
              <div className="route-loading-grid">
                <span /><span /><span />
              </div>
            </section>
          ) : account === null ? (
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
              <div className="auth-divider"><span>{t("또는")}</span></div>
              <GoogleSignInButton
                busy={busy}
                onCredential={(idToken) => void handleGoogleCredential(idToken)}
                onError={setMessage}
              />
              {googleStep === "register" && (
                <section className="google-auth-followup">
                  <strong>{t("Tango에서 사용할 닉네임을 정해주세요.")}</strong>
                  <label className="online-field">
                    <span>{t("닉네임")}</span>
                    <input value={displayName} maxLength={24} onChange={(event) => setDisplayName(event.target.value)} />
                  </label>
                  <div className="segmented-control two-up">
                    {(["orbit", "prism"] as const).map((avatar) => (
                      <button key={avatar} type="button" className={avatarId === avatar ? "active" : ""} onClick={() => setAvatarId(avatar)}>
                        {avatar === "orbit" ? "Orbit" : "Prism"}
                      </button>
                    ))}
                  </div>
                  <button className="primary-action" type="button" disabled={busy || displayName.trim().length < 2} onClick={() => void finishGoogleRegistration()}>
                    {t("Google 계정으로 시작")}
                  </button>
                </section>
              )}
              {googleStep === "link" && (
                <section className="google-auth-followup">
                  <strong>{t("이미 같은 이메일의 Tango 계정이 있습니다.")}</strong>
                  <p>{t("기존 비밀번호를 확인하면 Google 계정을 안전하게 연결합니다.")}</p>
                  <label className="online-field">
                    <span>{t("현재 비밀번호")}</span>
                    <input type="password" value={googlePassword} autoComplete="current-password" onChange={(event) => setGooglePassword(event.target.value)} />
                  </label>
                  <button className="primary-action" type="button" disabled={busy || googlePassword.length < 8} onClick={() => void finishGoogleLink()}>
                    {t("Google 계정 연결")}
                  </button>
                </section>
              )}
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
                <span>
                  <small>{t("경기")}</small>
                  <strong>{formatNumber(
                    allMatchStats.wins
                    + allMatchStats.losses
                    + allMatchStats.draws,
                  )}</strong>
                </span>
                <span><small>{t("승")}</small><strong>{formatNumber(allMatchStats.wins)}</strong></span>
                <span><small>{t("패")}</small><strong>{formatNumber(allMatchStats.losses)}</strong></span>
                <span><small>{t("무")}</small><strong>{formatNumber(allMatchStats.draws)}</strong></span>
                <span>
                  <small>{t("이번 주 출석")}</small>
                  <strong>{t("{count}회", { count: formatNumber(economySummary?.attendance.weeklyCount ?? 0) })}</strong>
                </span>
                <span>
                  <small>{t("최근 출석")}</small>
                  <strong>{account.lastAttendanceDate ?? "-"}</strong>
                </span>
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
                <section className="account-tab-section account-records">
                  <div className="account-record-heading">
                    <h3>{t("최근 전적")}</h3>
                    <div className="record-mode-tabs" role="tablist" aria-label={t("전적 모드")}>
                      {([
                        ["all", "전체"],
                        ["casual", "일반"],
                        ["ranked", "경쟁"],
                      ] as const).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={recordMode === key ? "active" : ""}
                          onClick={() => {
                            setRecordMode(key);
                            setMatchesExpanded(false);
                          }}
                        >
                          {t(label)}
                        </button>
                      ))}
                    </div>
                    <div className="record-outcome-summary" aria-label={t("경쟁전 승패무")}>
                      <span className="win"><small>{t("승")}</small><strong>{formatNumber(statsForAccount(account, recordMode).wins)}</strong></span>
                      <span className="loss"><small>{t("패")}</small><strong>{formatNumber(statsForAccount(account, recordMode).losses)}</strong></span>
                      <span className="draw"><small>{t("무")}</small><strong>{formatNumber(statsForAccount(account, recordMode).draws)}</strong></span>
                    </div>
                  </div>
                  {matches.filter((match) => recordMode === "all" || match.mode === recordMode).length === 0 ? (
                    <p className="online-message">{t("아직 기록된 경기가 없습니다.")}</p>
                  ) : (
                    <>
                      <div className="match-history">
                        {matches
                          .filter((match) => recordMode === "all" || match.mode === recordMode)
                          .slice(0, matchesExpanded ? matches.length : 5)
                          .map((match) => {
                          const outcomeLabel = match.outcome === "win" ? "승리" : match.outcome === "loss" ? "패배" : "무승부";
                          const outcomeClass = match.outcome;
                          return (
                            <article className={`match-history-${outcomeClass}`} key={match.gameId}>
                              <b className={`match-outcome-badge ${outcomeClass}`}>{t(outcomeLabel)}</b>
                              <span>
                                <b>{t(matchModeLabels[match.mode] ?? match.mode)} · {match.opponentName}</b>
                                <small>{t(match.result === null ? "완료" : matchResultLabels[match.result] ?? match.result)} · TURN {match.turnNumber}</small>
                              </span>
                              <Link to={`/replay/${encodeURIComponent(match.gameId)}`}>{t("리플레이")}</Link>
                            </article>
                          );
                        })}
                      </div>
                      {matches.filter((match) => recordMode === "all" || match.mode === recordMode).length > 5 && (
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
                <>
                  <section className="nickname-change-card">
                    <div>
                      <strong>{t("닉네임 변경")}</strong>
                      <p>{account.displayNameChangeAvailableAt === null || new Date(account.displayNameChangeAvailableAt) <= new Date()
                        ? t("닉네임을 변경할 수 있습니다.")
                        : t("{date}부터 다시 변경할 수 있습니다.", {
                            date: new Date(account.displayNameChangeAvailableAt).toLocaleDateString(),
                          })}</p>
                    </div>
                    <div className="nickname-change-form">
                      <input
                        value={nicknameDraft}
                        minLength={2}
                        maxLength={24}
                        onChange={(event) => setNicknameDraft(event.target.value)}
                      />
                      <button
                        className="secondary-action"
                        type="button"
                        disabled={
                          nicknameBusy
                          || nicknameDraft.trim().length < 2
                          || nicknameDraft.trim() === account.displayName
                          || (account.displayNameChangeAvailableAt !== null
                            && new Date(account.displayNameChangeAvailableAt) > new Date())
                        }
                        onClick={() => void changeNickname()}
                      >
                        {t("변경")}
                      </button>
                    </div>
                  </section>
                  <section className="google-connection-card">
                    <div>
                      <strong>Google</strong>
                      <p>{t(authMethods.google ? "Google 계정이 연결되어 있습니다." : "Google 계정을 연결하면 더 간편하게 로그인할 수 있습니다.")}</p>
                    </div>
                    {authMethods.google ? (
                      <button
                        className="secondary-action"
                        type="button"
                        disabled={!authMethods.password}
                        onClick={() => {
                          void unlinkGoogleAccount()
                            .then(() => setAuthMethods({ ...authMethods, google: false }))
                            .catch((error: unknown) => setMessage(error instanceof ApiError ? error.code : "GOOGLE_SIGN_IN_FAILED"));
                        }}
                      >
                        {t("연결 해제")}
                      </button>
                    ) : (
                      <GoogleSignInButton busy={busy} onCredential={(idToken) => void handleGoogleCredential(idToken)} onError={setMessage} />
                    )}
                  </section>
                  {googleStep === "link" && (
                    <section className="google-auth-followup">
                      <label className="online-field">
                        <span>{t("현재 비밀번호")}</span>
                        <input type="password" value={googlePassword} autoComplete="current-password" onChange={(event) => setGooglePassword(event.target.value)} />
                      </label>
                      <button className="primary-action" type="button" disabled={busy || googlePassword.length < 8} onClick={() => void finishGoogleLink()}>
                        {t("Google 계정 연결")}
                      </button>
                    </section>
                  )}
                  <section className="account-security-actions">
                    <Link className="account-policy-link" to="/privacy">{t("개인정보 처리방침")}</Link>
                    <button className="secondary-action" type="button" onClick={logout}>{t("로그아웃")}</button>
                    <button className="danger-action" type="button" onClick={() => setDeleteOpen(true)}>{t("계정 삭제")}</button>
                  </section>
                </>
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
            {authMethods.password ? (
              <label className="online-field">
                <span>{t("현재 비밀번호")}</span>
                <input
                  value={deletePassword}
                  type="password"
                  autoComplete="current-password"
                  onChange={(event) => setDeletePassword(event.target.value)}
                />
              </label>
            ) : (
              <p>{t("Google 로그인을 다시 사용할 수 없으며 모든 데이터가 즉시 삭제됩니다.")}</p>
            )}
            {message !== null && <p className="online-message">{t(message)}</p>}
            <div className="result-actions">
              <button className="secondary-action" type="button" onClick={() => setDeleteOpen(false)}>{t("취소")}</button>
              <button className="danger-action" type="button" disabled={deleteBusy || (authMethods.password && deletePassword.length < 8)} onClick={() => void removeAccount()}>
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
