import { afterEach, describe, expect, it } from "vitest";
import type {
  AccountStore,
  AccountSummary,
  AuthMethods,
  GoogleIdentity,
  MatchHistoryItem,
  PublicProfile,
} from "./auth-store.js";
import type { AnalyticsStore, VisitorCounts } from "./analytics-store.js";
import { createReconnectToken, createServer, verifyReconnectToken } from "./server.js";
import type { RoomSnapshot } from "@color-game/shared-types";
import type {
  GoogleTokenVerifier,
  VerifiedGoogleIdentity,
} from "./google-auth.js";

class FakeGoogleTokenVerifier implements GoogleTokenVerifier {
  readonly enabled = true;

  async verify(idToken: string): Promise<VerifiedGoogleIdentity | null> {
    if (idToken !== "valid-google-token".repeat(10)) return null;
    return {
      subject: "google-subject-1",
      email: "google@example.com",
      name: "Google Player",
      picture: null,
    };
  }
}

class MemoryAccountStore implements AccountStore {
  readonly enabled = true;

  private readonly accounts = new Map<string, AccountSummary & {
    activeSessionId: string | null;
    password: string | null;
    googleSubject: string | null;
  }>();

  async close(): Promise<void> {
    return undefined;
  }

  async register(input: {
    email: string;
    password: string;
    displayName: string;
    avatarId: string;
  }): Promise<AccountSummary> {
    const email = input.email.toLowerCase();
    if ([...this.accounts.values()].some((account) => account.email === email)) {
      throw new Error("duplicate account");
    }

    const account = {
      id: `account-${this.accounts.size + 1}`,
      email,
      displayName: input.displayName,
      avatarId: input.avatarId,
      rating: 1000,
      gamesPlayed: 0,
      rankedWins: 0,
      rankedLosses: 0,
      rankedDraws: 0,
      casualWins: 0,
      casualLosses: 0,
      casualDraws: 0,
      displayNameChangedAt: null,
      attendanceStreak: 0,
      longestAttendanceStreak: 0,
      lastAttendanceDate: null,
      createdAt: new Date(0).toISOString(),
      activeSessionId: null,
      password: input.password,
      googleSubject: null,
    };
    this.accounts.set(account.id, account);
    return account;
  }

  async authenticate(email: string, password: string): Promise<AccountSummary | null> {
    const account = [...this.accounts.values()].find(
      (candidate) => candidate.email === email.toLowerCase(),
    );
    return account?.password !== null && account?.password === password ? account : null;
  }

  async getAccountByEmail(email: string): Promise<AccountSummary | null> {
    return [...this.accounts.values()].find(
      (candidate) => candidate.email === email.toLowerCase(),
    ) ?? null;
  }

  async getAccountByGoogleSubject(subject: string): Promise<AccountSummary | null> {
    return [...this.accounts.values()].find(
      (candidate) => candidate.googleSubject === subject,
    ) ?? null;
  }

  async registerGoogle(input: {
    identity: GoogleIdentity;
    displayName: string;
    avatarId: string;
  }): Promise<AccountSummary> {
    if (await this.getAccountByEmail(input.identity.email) !== null) {
      throw new Error("duplicate account");
    }
    const account = {
      id: `account-${this.accounts.size + 1}`,
      email: input.identity.email.toLowerCase(),
      displayName: input.displayName,
      avatarId: input.avatarId,
      rating: 1000,
      gamesPlayed: 0,
      rankedWins: 0,
      rankedLosses: 0,
      rankedDraws: 0,
      casualWins: 0,
      casualLosses: 0,
      casualDraws: 0,
      displayNameChangedAt: null,
      attendanceStreak: 0,
      longestAttendanceStreak: 0,
      lastAttendanceDate: null,
      createdAt: new Date(0).toISOString(),
      activeSessionId: null,
      password: null,
      googleSubject: input.identity.subject,
    };
    this.accounts.set(account.id, account);
    return account;
  }

  async linkGoogle(accountId: string, identity: GoogleIdentity): Promise<void> {
    const account = this.accounts.get(accountId);
    if (account === undefined || await this.getAccountByGoogleSubject(identity.subject) !== null) {
      throw new Error("duplicate identity");
    }
    this.accounts.set(accountId, { ...account, googleSubject: identity.subject });
  }

  async unlinkGoogle(accountId: string): Promise<boolean> {
    const account = this.accounts.get(accountId);
    if (account === undefined || account.googleSubject === null) return false;
    this.accounts.set(accountId, { ...account, googleSubject: null });
    return true;
  }

  async getAuthMethods(accountId: string): Promise<AuthMethods> {
    const account = this.accounts.get(accountId);
    return {
      password: account?.password !== null && account?.password !== undefined,
      google: account?.googleSubject !== null && account?.googleSubject !== undefined,
    };
  }

  async getAccount(accountId: string): Promise<AccountSummary | null> {
    return this.accounts.get(accountId) ?? null;
  }

  async getAccountForSession(accountId: string, sessionId: string): Promise<AccountSummary | null> {
    const account = this.accounts.get(accountId);
    if (account === undefined || account.activeSessionId !== sessionId) return null;
    return account;
  }

  async updateDisplayName(accountId: string, displayName: string): Promise<AccountSummary | null> {
    const account = this.accounts.get(accountId);
    if (account === undefined) return null;
    const updated = {
      ...account,
      displayName,
      displayNameChangedAt: new Date().toISOString(),
    };
    this.accounts.set(accountId, updated);
    return updated;
  }

  async rotateSession(accountId: string): Promise<string | null> {
    const account = this.accounts.get(accountId);
    if (account === undefined) return null;
    const activeSessionId = `session-${accountId}-${Date.now()}-${Math.random()}`;
    this.accounts.set(accountId, { ...account, activeSessionId });
    return activeSessionId;
  }

  async deleteAccount(accountId: string): Promise<boolean> {
    return this.accounts.delete(accountId);
  }

  async getPublicProfile(accountId: string): Promise<PublicProfile | null> {
    const account = this.accounts.get(accountId);
    if (account === undefined) return null;
    return {
      id: account.id,
      displayName: account.displayName,
      avatarId: account.avatarId,
      rating: account.rating,
      gamesPlayed: account.gamesPlayed,
      rankedWins: account.rankedWins,
      rankedLosses: account.rankedLosses,
      rankedDraws: account.rankedDraws,
    };
  }

  async getLeaderboard(): Promise<PublicProfile[]> {
    return Promise.all([...this.accounts.keys()].map((id) => this.getPublicProfile(id)))
      .then((profiles) => profiles.filter((profile): profile is PublicProfile => profile !== null));
  }

  async getMatchHistory(): Promise<MatchHistoryItem[]> {
    return [];
  }

  async checkInAttendance(accountId: string, attendedOn: string): Promise<AccountSummary | null> {
    const account = this.accounts.get(accountId);
    if (account === undefined) return null;
    const nextStreak = account.lastAttendanceDate === attendedOn
      ? account.attendanceStreak
      : account.attendanceStreak + 1;
    const updated = {
      ...account,
      attendanceStreak: nextStreak,
      longestAttendanceStreak: Math.max(account.longestAttendanceStreak, nextStreak),
      lastAttendanceDate: attendedOn,
    };
    this.accounts.set(accountId, updated);
    return updated;
  }

  async recordFinishedRoom(_room: RoomSnapshot): Promise<void> {
    return undefined;
  }
}

class MemoryAnalyticsStore implements AnalyticsStore {
  readonly enabled = true;

  private readonly visitors = new Map<string, { lastSeenAt: Date }>();

  async close(): Promise<void> {
    return undefined;
  }

  async recordHeartbeat(input: {
    visitorId: string;
    path: string | null;
    userAgent: string | null;
  }): Promise<void> {
    this.visitors.set(input.visitorId, { lastSeenAt: new Date() });
  }

  async getVisitorCounts(now = new Date()): Promise<VisitorCounts> {
    const realtimeStart = now.getTime() - 60_000;
    const realtime = [...this.visitors.values()].filter(
      (visitor) => visitor.lastSeenAt.getTime() >= realtimeStart,
    ).length;

    return {
      realtime,
      daily: this.visitors.size,
      monthly: this.visitors.size,
      updatedAt: now.toISOString(),
    };
  }
}

describe("auth routes", () => {
  const apps: Array<ReturnType<typeof createServer>["app"]> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("registers an account, returns the current user, and exposes leaderboard entries", async () => {
    const accountStore = new MemoryAccountStore();
    const { app } = createServer({
      accountStore,
      authSecret: "test-auth-secret-with-more-than-32-characters",
    });
    apps.push(app);

    const registered = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "Player@example.com",
        password: "password123",
        displayName: "Player One",
        avatarId: "orbit",
      },
    });
    expect(registered.statusCode).toBe(200);

    const authBody = registered.json<{
      token: string;
      account: AccountSummary;
    }>();
    expect(authBody.account.email).toBe("player@example.com");

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        authorization: `Bearer ${authBody.token}`,
      },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json<{ account: AccountSummary }>().account.displayName).toBe("Player One");

    const firstCheckIn = await app.inject({
      method: "POST",
      url: "/attendance/check-in",
      headers: { authorization: `Bearer ${authBody.token}` },
      payload: { timeZone: "Asia/Seoul" },
    });
    expect(firstCheckIn.statusCode).toBe(200);
    expect(firstCheckIn.json<{ account: AccountSummary }>().account.attendanceStreak).toBe(1);

    const repeatedCheckIn = await app.inject({
      method: "POST",
      url: "/attendance/check-in",
      headers: { authorization: `Bearer ${authBody.token}` },
      payload: { timeZone: "Asia/Seoul" },
    });
    expect(repeatedCheckIn.json<{ account: AccountSummary }>().account.attendanceStreak).toBe(1);

    const leaderboard = await app.inject({
      method: "GET",
      url: "/leaderboard",
    });
    expect(leaderboard.statusCode).toBe(200);
    expect(leaderboard.json<{ players: PublicProfile[] }>().players).toHaveLength(1);
  });

  it("keeps only the newest login session valid for an account", async () => {
    const accountStore = new MemoryAccountStore();
    const { app } = createServer({
      accountStore,
      authSecret: "test-auth-secret-with-more-than-32-characters",
    });
    apps.push(app);

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "same@example.com",
        password: "password123",
        displayName: "Same Player",
        avatarId: "orbit",
      },
    });

    const firstLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "same@example.com",
        password: "password123",
      },
    });
    expect(firstLogin.statusCode).toBe(200);
    const firstToken = firstLogin.json<{ token: string }>().token;

    const secondLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "same@example.com",
        password: "password123",
      },
    });
    expect(secondLogin.statusCode).toBe(200);
    const secondToken = secondLogin.json<{ token: string }>().token;
    expect(secondToken).not.toBe(firstToken);

    const oldSession = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${firstToken}` },
    });
    expect(oldSession.statusCode).toBe(401);

    const currentSession = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${secondToken}` },
    });
    expect(currentSession.statusCode).toBe(200);
  });

  it("allows a nickname change and enforces the 14 day cooldown", async () => {
    const accountStore = new MemoryAccountStore();
    const { app } = createServer({
      accountStore,
      authSecret: "test-auth-secret-with-more-than-32-characters",
    });
    apps.push(app);

    const registered = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "nickname@example.com",
        password: "password123",
        displayName: "First Name",
        avatarId: "orbit",
      },
    });
    const token = registered.json<{ token: string }>().token;

    const changed = await app.inject({
      method: "PATCH",
      url: "/auth/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: "Second Name" },
    });
    expect(changed.statusCode).toBe(200);
    expect(changed.json<{ account: AccountSummary }>().account.displayName).toBe("Second Name");

    const blocked = await app.inject({
      method: "PATCH",
      url: "/auth/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: "Third Name" },
    });
    expect(blocked.statusCode).toBe(409);
    const body = blocked.json<{ code: string; availableAt: string }>();
    expect(body.code).toBe("NICKNAME_CHANGE_COOLDOWN");
    expect(new Date(body.availableAt).getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);
  });

  it("requires password confirmation and permanently deletes an account", async () => {
    const accountStore = new MemoryAccountStore();
    const { app } = createServer({
      accountStore,
      authSecret: "test-auth-secret-with-more-than-32-characters",
    });
    apps.push(app);

    const registered = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "delete@example.com",
        password: "password123",
        displayName: "Delete Me",
        avatarId: "orbit",
      },
    });
    const token = registered.json<{ token: string }>().token;

    const wrongPassword = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: { authorization: `Bearer ${token}` },
      payload: { password: "incorrect123" },
    });
    expect(wrongPassword.statusCode).toBe(403);

    const deleted = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: { authorization: `Bearer ${token}` },
      payload: { password: "password123" },
    });
    expect(deleted.statusCode).toBe(204);

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.statusCode).toBe(401);

    const leaderboard = await app.inject({ method: "GET", url: "/leaderboard" });
    expect(leaderboard.json<{ players: PublicProfile[] }>().players).toHaveLength(0);
  });

  it("creates a Google account only after nickname confirmation and reuses its identity", async () => {
    const accountStore = new MemoryAccountStore();
    const { app } = createServer({
      accountStore,
      googleTokenVerifier: new FakeGoogleTokenVerifier(),
      authSecret: "test-auth-secret-with-more-than-32-characters",
    });
    apps.push(app);
    const idToken = "valid-google-token".repeat(10);

    const needsProfile = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { idToken },
    });
    expect(needsProfile.statusCode).toBe(428);
    expect(needsProfile.json<{ code: string }>().code).toBe("GOOGLE_REGISTRATION_REQUIRED");

    const registered = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { idToken, displayName: "Tango Google", avatarId: "prism" },
    });
    expect(registered.statusCode).toBe(200);
    expect(registered.json<{ account: AccountSummary }>().account.email).toBe("google@example.com");

    const signedInAgain = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { idToken },
    });
    expect(signedInAgain.statusCode).toBe(200);
    expect(signedInAgain.json<{ account: AccountSummary }>().account.displayName).toBe("Tango Google");

    const googleToken = signedInAgain.json<{ token: string }>().token;
    const missingConfirmation = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: { authorization: `Bearer ${googleToken}` },
      payload: {},
    });
    expect(missingConfirmation.statusCode).toBe(400);

    const missingReauthentication = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: { authorization: `Bearer ${googleToken}` },
      payload: { confirmation: "DELETE" },
    });
    expect(missingReauthentication.statusCode).toBe(400);
    expect(missingReauthentication.json<{ code: string }>().code).toBe("GOOGLE_REAUTH_REQUIRED");

    const invalidReauthentication = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: { authorization: `Bearer ${googleToken}` },
      payload: { confirmation: "DELETE", idToken: "invalid-google-token".repeat(10) },
    });
    expect(invalidReauthentication.statusCode).toBe(403);

    const deleted = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: { authorization: `Bearer ${googleToken}` },
      payload: { confirmation: "DELETE", idToken },
    });
    expect(deleted.statusCode).toBe(204);
  });

  it("signs reconnect capabilities and rejects tampering or expiry", () => {
    const secret = "test-auth-secret-with-more-than-32-characters";
    const now = Date.UTC(2026, 6, 22);
    const token = createReconnectToken({
      code: "abcd12",
      playerId: "player-1",
      subjectType: "account",
      subjectId: "account-1",
    }, secret, now);

    expect(verifyReconnectToken(token, secret, now)).toMatchObject({
      code: "ABCD12",
      playerId: "player-1",
      subjectType: "account",
      subjectId: "account-1",
    });
    expect(verifyReconnectToken(`${token.slice(0, -1)}x`, secret, now)).toBeNull();
    expect(verifyReconnectToken(token, secret, now + 86_400_000)).toBeNull();
  });

  it("does not allow arbitrary origins when CORS is not configured", async () => {
    const { app } = createServer();
    apps.push(app);
    const response = await app.inject({
      method: "OPTIONS",
      url: "/auth/login",
      headers: {
        origin: "https://attacker.example",
        "access-control-request-method": "POST",
      },
    });
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rate limits repeated authentication attempts", async () => {
    const { app } = createServer({ accountStore: new MemoryAccountStore() });
    apps.push(app);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "missing@example.com", password: "password123" },
      });
      expect(response.statusCode).toBe(401);
    }
    const limited = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "missing@example.com", password: "password123" },
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.json<{ code: string }>().code).toBe("RATE_LIMITED");
  });

  it("requires the existing password before linking a matching Google email", async () => {
    const accountStore = new MemoryAccountStore();
    const { app } = createServer({
      accountStore,
      googleTokenVerifier: new FakeGoogleTokenVerifier(),
      authSecret: "test-auth-secret-with-more-than-32-characters",
    });
    apps.push(app);
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "google@example.com",
        password: "password123",
        displayName: "Existing Player",
        avatarId: "orbit",
      },
    });
    const idToken = "valid-google-token".repeat(10);

    const conflict = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { idToken },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json<{ code: string }>().code).toBe("GOOGLE_LINK_REQUIRED");

    const wrongPassword = await app.inject({
      method: "POST",
      url: "/auth/google/link",
      payload: { idToken, password: "incorrect123" },
    });
    expect(wrongPassword.statusCode).toBe(403);

    const linked = await app.inject({
      method: "POST",
      url: "/auth/google/link",
      payload: { idToken, password: "password123" },
    });
    expect(linked.statusCode).toBe(200);
    const token = linked.json<{ token: string }>().token;
    const methods = await app.inject({
      method: "GET",
      url: "/auth/methods",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(methods.json<{ methods: AuthMethods }>().methods).toEqual({
      password: true,
      google: true,
    });
  });

  it("allows Android WebView preflight requests for account deletion", async () => {
    const { app } = createServer({
      corsOrigin: ["https://localhost"],
    });
    apps.push(app);

    const preflight = await app.inject({
      method: "OPTIONS",
      url: "/auth/account",
      headers: {
        origin: "https://localhost",
        "access-control-request-method": "DELETE",
        "access-control-request-headers": "authorization,content-type",
      },
    });

    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe("https://localhost");
    expect(preflight.headers["access-control-allow-methods"]).toContain("DELETE");
  });

  it("records anonymous visitor heartbeats and exposes visitor counts", async () => {
    const analyticsStore = new MemoryAnalyticsStore();
    const { app } = createServer({ analyticsStore });
    apps.push(app);

    const heartbeat = await app.inject({
      method: "POST",
      url: "/analytics/heartbeat",
      payload: {
        visitorId: "visitor-test-1",
        path: "/",
      },
    });
    expect(heartbeat.statusCode).toBe(200);
    expect(heartbeat.json<{ visitors: VisitorCounts }>().visitors).toMatchObject({
      realtime: 1,
      daily: 1,
      monthly: 1,
    });

    const visitors = await app.inject({
      method: "GET",
      url: "/analytics/visitors",
    });
    expect(visitors.statusCode).toBe(200);
    expect(visitors.json<{ visitors: VisitorCounts }>().visitors).toMatchObject({
      realtime: 1,
      daily: 1,
      monthly: 1,
    });
  });
});
