import { afterEach, describe, expect, it } from "vitest";
import type {
  AccountStore,
  AccountSummary,
  MatchHistoryItem,
  PublicProfile,
} from "./auth-store.js";
import type { AnalyticsStore, VisitorCounts } from "./analytics-store.js";
import { createServer } from "./server.js";
import type { RoomSnapshot } from "@color-game/shared-types";

class MemoryAccountStore implements AccountStore {
  readonly enabled = true;

  private readonly accounts = new Map<string, AccountSummary & { password: string }>();

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
      attendanceStreak: 0,
      longestAttendanceStreak: 0,
      lastAttendanceDate: null,
      createdAt: new Date(0).toISOString(),
      password: input.password,
    };
    this.accounts.set(account.id, account);
    return account;
  }

  async authenticate(email: string, password: string): Promise<AccountSummary | null> {
    const account = [...this.accounts.values()].find(
      (candidate) => candidate.email === email.toLowerCase(),
    );
    return account?.password === password ? account : null;
  }

  async getAccount(accountId: string): Promise<AccountSummary | null> {
    return this.accounts.get(accountId) ?? null;
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
