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

export class ApiError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type CosmeticRarity = "common" | "rare" | "epic" | "legendary";
export type CosmeticCategory = "tile_color" | "placement_effect" | "score_effect" | "profile" | "victory_effect";
export type CosmeticEquipSlot =
  | "tile_color"
  | "placement_effect"
  | "score_effect"
  | "victory_effect"
  | "profile_frame"
  | "profile_badge"
  | "profile_title";
export type TileLoadoutSlot = "colorA" | "colorB" | "colorC";

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  equipSlot: CosmeticEquipSlot;
  rarity: CosmeticRarity;
  nameKo: string;
  nameEn: string;
  localizedNames: Record<string, string>;
  descriptionKo: string;
  chipPrice: number;
  visualKind: "solid" | "split" | "gradient" | "pattern" | "placeholder";
  colors: string[];
  pattern: string | null;
  representativeColor: string | null;
  availability: "active" | "upcoming" | "pack_only";
  owned: boolean;
  equippedSlots: TileLoadoutSlot[];
}

export interface EconomyOverview {
  wallet: {
    colorChips: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
  };
  fragments: Record<CosmeticRarity, number>;
  weeklyStore: {
    weekKey: string;
    endsAt: string;
    items: CosmeticItem[];
  };
  inventory: CosmeticItem[];
  loadout: Partial<Record<TileLoadoutSlot, string>>;
  upcomingCategories: Array<Exclude<CosmeticCategory, "tile_color">>;
  quests: Array<{
    key: "welcome" | "attendance" | "attendance_streak" | "online_matches" | "first_online_win" | "reward_ad";
    cycleKey: string;
    rewardChips: number;
    claimed: boolean;
    claimable: boolean;
    progress: number;
    goal: number;
  }>;
  ledger: Array<{
    id: string;
    delta: number;
    reason: string;
    balanceAfter: number;
    createdAt: string;
  }>;
  entitlements: string[];
  monetization: {
    rewardAds: {
      status: "upcoming" | "available" | "ended";
      rewardChips: number;
      dailyLimit: number;
      usedToday: number;
    };
    founderPack: {
      status: "upcoming" | "available" | "ended";
      referencePriceKrw: number;
      bonusChips: number;
      startsAt: string | null;
      endsAt: string | null;
    };
    premiumPack: {
      status: "upcoming" | "available" | "ended";
      referencePriceKrw: number;
    };
  };
  box: {
    priceChips: number;
    fragmentRequirement: number;
    probabilityVersion: string;
    outcomes: Array<{
      type: "fragment" | "cosmetic";
      rarity: CosmeticRarity;
      probability: number;
    }>;
  };
}

export interface CosmeticOutcome {
  type: "fragment" | "cosmetic";
  rarity: CosmeticRarity;
  cosmetic: CosmeticItem | null;
  fragmentQuantity: number;
  overview: EconomyOverview;
}

export const getAuthToken = (): string | null =>
  window.localStorage.getItem(tokenKey);

export const saveAuthToken = (token: string): void => {
  window.localStorage.setItem(tokenKey, token);
};

export const clearAuthToken = (): void => {
  window.localStorage.removeItem(tokenKey);
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({})) as T & { code?: string; message?: string };
  if (!response.ok) {
    if (response.status === 401 && data.code === "UNAUTHORIZED") {
      clearAuthToken();
    }
    throw new ApiError(data.code ?? "REQUEST_FAILED", data.message ?? "Request failed.");
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

export const deleteAccount = async (password: string): Promise<void> => {
  await request<void>("/auth/account", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
  clearAuthToken();
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
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const data = await request<{ account: Account }>("/attendance/check-in", {
    method: "POST",
    body: JSON.stringify({ timeZone }),
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

const browserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const fetchEconomy = async (): Promise<EconomyOverview> => {
  const query = new URLSearchParams({ timeZone: browserTimeZone() });
  const data = await request<{ economy: EconomyOverview }>(`/economy/overview?${query}`);
  return data.economy;
};

export const claimEconomyQuest = async (
  quest: "welcome" | "attendance" | "attendance-streak" | "first-online-win",
): Promise<{ economy: EconomyOverview; account?: Account }> => {
  return request<{ economy: EconomyOverview; account?: Account }>(
    `/economy/quests/${quest}/claim`,
    {
      method: "POST",
      body: JSON.stringify({ timeZone: browserTimeZone() }),
    },
  );
};

export const purchaseCosmetic = async (cosmeticId: string): Promise<EconomyOverview> => {
  const data = await request<{ economy: EconomyOverview }>(
    `/economy/store/${encodeURIComponent(cosmeticId)}/purchase`,
    {
      method: "POST",
      body: JSON.stringify({ timeZone: browserTimeZone() }),
    },
  );
  return data.economy;
};

export const openPaletteBox = async (): Promise<CosmeticOutcome> => {
  const data = await request<{ outcome: CosmeticOutcome }>("/economy/box/open", {
    method: "POST",
    body: JSON.stringify({ timeZone: browserTimeZone() }),
  });
  return data.outcome;
};

export const combineCosmeticFragments = async (
  rarity: CosmeticRarity,
): Promise<CosmeticOutcome> => {
  const data = await request<{ outcome: CosmeticOutcome }>("/economy/fragments/combine", {
    method: "POST",
    body: JSON.stringify({ rarity, timeZone: browserTimeZone() }),
  });
  return data.outcome;
};

export const equipTileColor = async (
  slot: TileLoadoutSlot,
  cosmeticId: string,
): Promise<EconomyOverview> => {
  const data = await request<{ economy: EconomyOverview }>(
    `/economy/loadout/tile/${slot}`,
    {
      method: "PUT",
      body: JSON.stringify({ cosmeticId, timeZone: browserTimeZone() }),
    },
  );
  return data.economy;
};
