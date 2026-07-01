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

export interface AuthMethods {
  password: boolean;
  google: boolean;
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
const adminTokenKey = "tango-admin-token";
export const authChangedEvent = "tango:auth-changed";

export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly details?: unknown) {
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
  splitAngle: number | null;
  representativeColor: string | null;
  availability: "active" | "upcoming" | "pack_only";
  owned: boolean;
  isNew: boolean;
  equippedSlots: TileLoadoutSlot[];
}

export interface EconomyOverview {
  wallet: {
    colorChips: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
  };
  boxTickets: number;
  fragments: Record<CosmeticRarity, number>;
  weeklyStore: {
    weekKey: string;
    endsAt: string;
    items: CosmeticItem[];
  };
  catalog: CosmeticItem[];
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

let accountCache: Account | null = null;
let accountRequest: Promise<Account> | null = null;
let economyCache: EconomyOverview | null = null;
let economyRequest: Promise<EconomyOverview> | null = null;

export const getAuthToken = (): string | null =>
  window.localStorage.getItem(tokenKey);

export const getCachedAccount = (): Account | null => accountCache;
export const getCachedEconomy = (): EconomyOverview | null => economyCache;

export const saveAuthToken = (token: string): void => {
  if (window.localStorage.getItem(tokenKey) !== token) {
    accountCache = null;
    economyCache = null;
  }
  window.localStorage.setItem(tokenKey, token);
  window.dispatchEvent(new Event(authChangedEvent));
};

export const clearAuthToken = (): void => {
  const hadToken = window.localStorage.getItem(tokenKey) !== null;
  window.localStorage.removeItem(tokenKey);
  accountCache = null;
  accountRequest = null;
  economyCache = null;
  economyRequest = null;
  if (hadToken) window.dispatchEvent(new Event(authChangedEvent));
};

const parseResponse = async <T>(response: Response, clearUserSession = true): Promise<T> => {
  const data = await response.json().catch(() => ({})) as T & { code?: string; message?: string };
  if (!response.ok) {
    if (clearUserSession && response.status === 401 && data.code === "UNAUTHORIZED") {
      clearAuthToken();
    }
    throw new ApiError(data.code ?? "REQUEST_FAILED", data.message ?? "Request failed.", data);
  }
  return data;
};

export type CouponReward =
  | { type: "color_chips"; amount: number }
  | { type: "palette_box_ticket"; amount: number }
  | { type: "fragments"; rarity: CosmeticRarity; amount: number }
  | { type: "cosmetic"; cosmeticId: string }
  | { type: "random_cosmetic"; cosmeticIds: string[]; pickCount: number }
  | { type: "entitlement"; entitlement: "premium" };

export interface CouponRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  rewards: CouponReward[];
  startsAt: string | null;
  expiresAt: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  rating: number;
  gamesPlayed: number;
  rankedWins: number;
  rankedLosses: number;
  rankedDraws: number;
  colorChips: number;
  boxTickets: number;
  cosmeticCount: number;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
}

export interface AdminAuditEntry {
  id: string;
  adminEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AdminCatalogItem {
  id: string;
  nameKo: string;
  rarity: CosmeticRarity;
  visualKind: CosmeticItem["visualKind"];
  colors: string[];
  pattern: string | null;
  splitAngle: number | null;
}

export interface CouponRedemptionResult {
  coupon: { id: string; code: string; name: string };
  rewards: Array<{
    type: CouponReward["type"];
    amount?: number;
    rarity?: CosmeticRarity;
    cosmeticId?: string;
    cosmeticName?: string;
    convertedToFragment?: boolean;
    entitlement?: "premium";
  }>;
}

const adminRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");
  const token = window.sessionStorage.getItem(adminTokenKey);
  if (token !== null) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
  if (response.status === 401) window.sessionStorage.removeItem(adminTokenKey);
  return parseResponse<T>(response, false);
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

export const deleteAccount = async (input: {
  password?: string;
  confirmation?: "DELETE";
}): Promise<void> => {
  await request<void>("/auth/account", {
    method: "DELETE",
    body: JSON.stringify(input),
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
  accountCache = data.account;
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
  accountCache = data.account;
  return data.account;
};

const saveAccountResponse = (data: { token: string; account: Account }): Account => {
  saveAuthToken(data.token);
  accountCache = data.account;
  return data.account;
};

export const loginWithGoogle = async (input: {
  idToken: string;
  displayName?: string;
  avatarId?: string;
}): Promise<Account> => {
  const data = await request<{ token: string; account: Account }>("/auth/google", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return saveAccountResponse(data);
};

export const linkGoogleAccount = async (input: {
  idToken: string;
  password: string;
}): Promise<Account> => {
  const data = await request<{ token: string; account: Account }>("/auth/google/link", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return saveAccountResponse(data);
};

export const fetchAuthMethods = async (): Promise<AuthMethods> =>
  (await request<{ methods: AuthMethods }>("/auth/methods")).methods;

export const unlinkGoogleAccount = async (): Promise<void> => {
  await request<void>("/auth/google", { method: "DELETE" });
};

export const fetchMe = async (
  options: { force?: boolean } = {},
): Promise<Account> => {
  if (!options.force && accountCache !== null) return accountCache;
  if (accountRequest !== null) return accountRequest;

  accountRequest = request<{ account: Account }>("/auth/me")
    .then((data) => {
      accountCache = data.account;
      return data.account;
    })
    .finally(() => {
      accountRequest = null;
    });
  return accountRequest;
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
  accountCache = data.account;
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

export const fetchEconomy = async (
  options: { force?: boolean } = {},
): Promise<EconomyOverview> => {
  if (!options.force && economyCache !== null) return economyCache;
  if (economyRequest !== null) return economyRequest;

  const query = new URLSearchParams({ timeZone: browserTimeZone() });
  economyRequest = request<{ economy: EconomyOverview }>(`/economy/overview?${query}`)
    .then((data) => {
      economyCache = data.economy;
      return data.economy;
    })
    .finally(() => {
      economyRequest = null;
    });
  return economyRequest;
};

export const claimEconomyQuest = async (
  quest: "welcome" | "attendance" | "attendance-streak" | "first-online-win",
): Promise<{ economy: EconomyOverview; account?: Account }> => {
  const result = await request<{ economy: EconomyOverview; account?: Account }>(
    `/economy/quests/${quest}/claim`,
    {
      method: "POST",
      body: JSON.stringify({ timeZone: browserTimeZone() }),
    },
  );
  economyCache = result.economy;
  if (result.account !== undefined) accountCache = result.account;
  return result;
};

export const purchaseCosmetic = async (cosmeticId: string): Promise<EconomyOverview> => {
  const data = await request<{ economy: EconomyOverview }>(
    `/economy/store/${encodeURIComponent(cosmeticId)}/purchase`,
    {
      method: "POST",
      body: JSON.stringify({ timeZone: browserTimeZone() }),
    },
  );
  economyCache = data.economy;
  return data.economy;
};

export const openPaletteBox = async (): Promise<CosmeticOutcome> => {
  const data = await request<{ outcome: CosmeticOutcome }>("/economy/box/open", {
    method: "POST",
    body: JSON.stringify({ timeZone: browserTimeZone() }),
  });
  economyCache = data.outcome.overview;
  return data.outcome;
};

export const combineCosmeticFragments = async (
  rarity: CosmeticRarity,
): Promise<CosmeticOutcome> => {
  const data = await request<{ outcome: CosmeticOutcome }>("/economy/fragments/combine", {
    method: "POST",
    body: JSON.stringify({ rarity, timeZone: browserTimeZone() }),
  });
  economyCache = data.outcome.overview;
  return data.outcome;
};

export const equipTileColor = async (
  slot: TileLoadoutSlot,
  cosmeticId: string,
  allowSimilar = false,
): Promise<EconomyOverview> => {
  const data = await request<{ economy: EconomyOverview }>(
    `/economy/loadout/tile/${slot}`,
    {
      method: "PUT",
      body: JSON.stringify({ cosmeticId, allowSimilar, timeZone: browserTimeZone() }),
    },
  );
  economyCache = data.economy;
  return data.economy;
};

export const resetTileColor = async (
  slot: TileLoadoutSlot,
): Promise<EconomyOverview> => {
  const data = await request<{ economy: EconomyOverview }>(
    `/economy/loadout/tile/${slot}`,
    {
      method: "DELETE",
      body: JSON.stringify({ timeZone: browserTimeZone() }),
    },
  );
  economyCache = data.economy;
  return data.economy;
};

export const redeemCoupon = async (
  code: string,
): Promise<{ redemption: CouponRedemptionResult; economy: EconomyOverview }> => {
  const result = await request<{ redemption: CouponRedemptionResult; economy: EconomyOverview }>("/coupons/redeem", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  economyCache = result.economy;
  return result;
};

export const hasAdminToken = (): boolean =>
  window.sessionStorage.getItem(adminTokenKey) !== null;

export const adminLogin = async (email: string, password: string) => {
  const data = await adminRequest<{
    token: string;
    admin: { id: string; email: string; displayName: string };
  }>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  window.sessionStorage.setItem(adminTokenKey, data.token);
  return data.admin;
};

export const adminLogout = (): void => {
  window.sessionStorage.removeItem(adminTokenKey);
};

export const fetchAdminMe = async () =>
  (await adminRequest<{ admin: { id: string; email: string; displayName: string } }>("/admin/auth/me")).admin;

export const fetchAdminCoupons = async (): Promise<CouponRecord[]> =>
  (await adminRequest<{ coupons: CouponRecord[] }>("/admin/coupons")).coupons;

export const saveAdminCoupon = async (
  input: Omit<CouponRecord, "id" | "redemptionCount" | "createdAt" | "updatedAt">,
  id?: string,
): Promise<CouponRecord> =>
  (await adminRequest<{ coupon: CouponRecord }>(id ? `/admin/coupons/${id}` : "/admin/coupons", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input),
  })).coupon;

export const deleteAdminCoupon = async (id: string): Promise<void> => {
  await adminRequest<void>(`/admin/coupons/${id}`, { method: "DELETE" });
};

export const fetchAdminCatalog = async (): Promise<AdminCatalogItem[]> =>
  (await adminRequest<{ catalog: AdminCatalogItem[] }>("/admin/catalog")).catalog;

export const fetchAdminUsers = async (query = ""): Promise<ManagedUser[]> =>
  (await adminRequest<{ users: ManagedUser[] }>(
    `/admin/users?${new URLSearchParams({ query, limit: "50" })}`,
  )).users;

export const adjustAdminUserChips = async (
  accountId: string,
  delta: number,
  reason: string,
): Promise<ManagedUser> =>
  (await adminRequest<{ user: ManagedUser }>(`/admin/users/${encodeURIComponent(accountId)}/chips`, {
    method: "POST",
    body: JSON.stringify({ delta, reason }),
  })).user;

export const grantAdminUserCosmetic = async (
  accountId: string,
  cosmeticId: string,
  reason: string,
): Promise<boolean> =>
  (await adminRequest<{ granted: boolean }>(
    `/admin/users/${encodeURIComponent(accountId)}/cosmetics`,
    {
      method: "POST",
      body: JSON.stringify({ cosmeticId, reason }),
    },
  )).granted;

export const grantAdminUserCosmetics = async (
  accountId: string,
  selection: { cosmeticIds?: string[]; rarity?: CosmeticRarity },
  reason: string,
): Promise<number> =>
  (await adminRequest<{ granted: number }>(
    `/admin/users/${encodeURIComponent(accountId)}/cosmetics/batch`,
    {
      method: "POST",
      body: JSON.stringify({ ...selection, reason }),
    },
  )).granted;

export const setAdminUserSuspension = async (
  accountId: string,
  suspended: boolean,
  reason: string,
): Promise<void> => {
  await adminRequest(`/admin/users/${encodeURIComponent(accountId)}/suspension`, {
    method: "PUT",
    body: JSON.stringify({ suspended, reason }),
  });
};

export const fetchAdminAudit = async (): Promise<AdminAuditEntry[]> =>
  (await adminRequest<{ entries: AdminAuditEntry[] }>("/admin/audit?limit=100")).entries;
