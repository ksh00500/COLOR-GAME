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

const apiUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SOCKET_URL ?? "http://localhost:8080";
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
