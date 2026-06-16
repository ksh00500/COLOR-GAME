import { FormEvent, useEffect, useState } from "react";
import {
  clearAuthToken,
  fetchMatches,
  fetchMe,
  loginAccount,
  registerAccount,
  type Account,
  type MatchHistoryItem,
} from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { SettingsPanel } from "../components/SettingsPanel";

type AuthMode = "login" | "register";

const matchOutcome = (match: MatchHistoryItem, accountId: string): string => {
  if (match.winnerAccountId === null) return "무승부";
  return match.winnerAccountId === accountId ? "승리" : "패배";
};

export function AccountPage() {
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

  useEffect(() => {
    void fetchMe()
      .then((nextAccount) => {
        setAccount(nextAccount);
        return fetchMatches(nextAccount.id);
      })
      .then(setMatches)
      .catch(() => undefined);
  }, []);

  const refreshMatches = async (nextAccount: Account) => {
    setMatches(await fetchMatches(nextAccount.id));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const nextAccount = mode === "login"
        ? await loginAccount({ email, password })
        : await registerAccount({ email, password, displayName, avatarId });
      setAccount(nextAccount);
      await refreshMatches(nextAccount);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "계정 요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setAccount(null);
    setMatches([]);
  };

  return (
    <main className="online-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="online-shell account-shell app-content-shell" aria-labelledby="account-title">
        <div className="online-copy">
          <p className="eyebrow">PLAYER ACCOUNT</p>
          <h1 id="account-title">전적과 레이팅은 계정에 저장됩니다.</h1>
          <p>
            경쟁 게임은 로그인한 플레이어만 참가할 수 있습니다. RDS가 연결되면 계정,
            리더보드, 최근 경기 기록이 모두 서버에 저장됩니다.
          </p>
        </div>

        <div className="online-card">
          {account === null ? (
            <form className="account-form" onSubmit={submit}>
              <div className="segmented-control two-up">
                <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>로그인</button>
                <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>회원가입</button>
              </div>

              <label className="online-field">
                <span>이메일</span>
                <input value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="online-field">
                <span>비밀번호</span>
                <input value={password} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} onChange={(event) => setPassword(event.target.value)} />
              </label>

              {mode === "register" && (
                <>
                  <label className="online-field">
                    <span>닉네임</span>
                    <input value={displayName} maxLength={24} onChange={(event) => setDisplayName(event.target.value)} />
                  </label>
                  <fieldset>
                    <legend>아바타</legend>
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
                {mode === "login" ? "로그인" : "계정 만들기"} <span aria-hidden="true">↗</span>
              </button>
              {message !== null && <p className="online-message">{message}</p>}
            </form>
          ) : (
            <section className="account-summary">
              <p className="eyebrow">SIGNED IN</p>
              <h2>{account.displayName}</h2>
              <div className="profile-stats">
                <span><small>레이팅</small><strong>{account.rating}</strong></span>
                <span><small>경기</small><strong>{account.gamesPlayed}</strong></span>
                <span><small>승</small><strong>{account.rankedWins}</strong></span>
                <span><small>패</small><strong>{account.rankedLosses}</strong></span>
              </div>
              <button className="secondary-action" type="button" onClick={logout}>로그아웃</button>
              <h3>최근 전적</h3>
              {matches.length === 0 ? (
                <p className="online-message">아직 기록된 경기가 없습니다.</p>
              ) : (
                <div className="match-history">
                  {matches.map((match) => (
                    <p key={match.gameId}>
                      <b>{match.mode.toUpperCase()} · {match.opponentName}</b>
                      <small>{matchOutcome(match, account.id)} · {match.result ?? "완료"} · TURN {match.turnNumber}</small>
                    </p>
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
