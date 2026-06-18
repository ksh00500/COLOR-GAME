import type { GameReplay } from "@color-game/shared-types";

export interface Account {
  id: string;
  email: string;
  displayName: string;
  avatarId: string;
  rating: number;
  gamesPlayed: number;
  rankedWins: number;
  rankedLosses: number;
  rankedDraws: number;
  attendanceStreak: number;
  longestAttendanceStreak: number;
  lastAttendanceDate: string | null;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  avatarId: string;
  rating: number;
  gamesPlayed: number;
  rankedWins: number;
  rankedLosses: number;
  rankedDraws: number;
}

export interface MatchHistoryItem {
  gameId: string;
  roomCode: string;
  mode: string;
  opponentName: string;
  result: string | null;
  winnerAccountId: string | null;
  ratingBefore: Record<string, number>;
  ratingAfter: Record<string, number>;
  turnNumber: number;
  finishedAt: string;
}

export interface VisitorCounts {
  realtime: number;
  daily: number;
  monthly: number;
  updatedAt: string;
}

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiUrl = (
  configuredApiUrl === undefined || configuredApiUrl === ""
    ? import.meta.env.DEV ? "http://localhost:8080" : ""
    : configuredApiUrl
).replace(/\/+$/, "");
const tokenKey = "color-game-auth-token";

export const getAuthToken = (): string | null =>
  window.localStorage.getItem(tokenKey);

export const saveAuthToken = (token: string): void => {
  window.localStorage.setItem(tokenKey, token);
};

export const clearAuthToken = (): void => {
  window.localStorage.removeItem(tokenKey);
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) {
    throw new Error(data.message ?? "요청을 처리하지 못했습니다.");
  }
  return data;
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");
  if (token !== null) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });
  return parseResponse<T>(response);
};

export const registerAccount = async (input: {
  email: string;
  password: string;
  displayName: string;
  avatarId: string;
}): Promise<Account> => {
  const data = await request<{ token: string; account: Account }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  saveAuthToken(data.token);
  return data.account;
};

export const loginAccount = async (input: {
  email: string;
  password: string;
}): Promise<Account> => {
  const data = await request<{ token: string; account: Account }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  saveAuthToken(data.token);
  return data.account;
};

export const fetchMe = async (): Promise<Account> => {
  const data = await request<{ account: Account }>("/auth/me");
  return data.account;
};

export const fetchLeaderboard = async (): Promise<PublicProfile[]> => {
  const data = await request<{ players: PublicProfile[] }>("/leaderboard?limit=50");
  return data.players;
};

export const fetchMatches = async (accountId: string): Promise<MatchHistoryItem[]> => {
  const data = await request<{ matches: MatchHistoryItem[] }>(
    `/profiles/${encodeURIComponent(accountId)}/matches?limit=20`,
  );
  return data.matches;
};

export const checkInAttendance = async (): Promise<Account> => {
  const data = await request<{ account: Account }>("/attendance/check-in", {
    method: "POST",
    body: "{}",
  });
  return data.account;
};

export const fetchReplay = async (gameId: string): Promise<GameReplay> => {
  const data = await request<{ replay: GameReplay }>(
    `/replays/${encodeURIComponent(gameId)}`,
  );
  return data.replay;
};

export const recordVisitorHeartbeat = async (
  visitorId: string,
  path: string,
): Promise<VisitorCounts> => {
  const data = await request<{ visitors: VisitorCounts }>("/analytics/heartbeat", {
    method: "POST",
    body: JSON.stringify({ visitorId, path }),
  });
  return data.visitors;
};

export const fetchVisitorCounts = async (): Promise<VisitorCounts> => {
  const data = await request<{ visitors: VisitorCounts }>("/analytics/visitors");
  return data.visitors;
};
