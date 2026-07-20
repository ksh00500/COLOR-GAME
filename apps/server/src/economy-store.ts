import { createHash, randomInt, randomUUID } from "node:crypto";
import { Pool, type PoolClient, type PoolConfig } from "pg";
import type { MatchCosmetics, RoomSnapshot } from "@color-game/shared-types";

export type CosmeticRarity = "common" | "rare" | "epic" | "legendary";
export type CosmeticCategory =
  | "tile_color"
  | "board_theme"
  | "placement_effect"
  | "score_effect"
  | "profile"
  | "victory_effect";
export type CosmeticEquipSlot =
  | "tile_color"
  | "board_theme"
  | "placement_effect"
  | "score_effect"
  | "victory_effect"
  | "profile_frame"
  | "profile_badge"
  | "profile_title";
export type TileLoadoutSlot = "colorA" | "colorB" | "colorC";
export type TileLoadout = Partial<Record<TileLoadoutSlot, string>>;
export type StyleLoadout = Partial<Record<
  "boardTheme" | "placementEffect" | "scoreEffect" | "victoryEffect",
  string
>>;
export interface TilePalettePreset {
  slotIndex: number;
  name: string | null;
  loadout: TileLoadout;
}
export type QuestKey =
  | "welcome"
  | "attendance"
  | "online_matches"
  | "first_online_win"
  | "daily_complete"
  | "weekly_attendance"
  | "weekly_matches"
  | "weekly_wins"
  | "weekly_complete"
  | "reward_ad";
export type OfferStatus = "upcoming" | "available" | "ended";

export interface EconomyCatalogItem {
  id: string;
  category: CosmeticCategory;
  equipSlot: CosmeticEquipSlot;
  rarity: CosmeticRarity;
  nameKo: string;
  nameEn: string;
  localizedNames: Record<string, string>;
  descriptionKo: string;
  chipPrice: number;
  visualKind: "solid" | "split" | "gradient" | "pattern" | "placeholder" | "board" | "placement" | "score" | "victory";
  colors: string[];
  pattern: string | null;
  splitAngle: number | null;
  preset: string | null;
  durationMs: number | null;
  collectionKey: string | null;
  representativeColor: string | null;
  availability: "active" | "upcoming" | "pack_only";
  owned: boolean;
  isNew: boolean;
  equippedSlots: TileLoadoutSlot[];
  wishlisted: boolean;
}

export interface EconomyQuest {
  key: QuestKey;
  period: "once" | "daily" | "weekly";
  cycleKey: string;
  rewardChips: number;
  rewardBoxTickets: number;
  claimed: boolean;
  claimable: boolean;
  progress: number;
  goal: number;
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
    items: EconomyCatalogItem[];
  };
  attendance: {
    dayKey: string;
    weekKey: string;
    weekStartsAt: string;
    weekEndsAt: string;
    attendedToday: boolean;
    weeklyCount: number;
    weeklyGoal: number;
  };
  catalog: EconomyCatalogItem[];
  inventory: EconomyCatalogItem[];
  loadout: TileLoadout;
  styleLoadout: StyleLoadout;
  wishlist: string[];
  tilePalettes: TilePalettePreset[];
  upcomingCategories: Array<Exclude<CosmeticCategory, "tile_color">>;
  quests: EconomyQuest[];
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
      status: OfferStatus;
      rewardChips: number;
      dailyLimit: number;
      usedToday: number;
    };
    founderPack: {
      status: OfferStatus;
      referencePriceKrw: number;
      bonusChips: number;
      startsAt: string | null;
      endsAt: string | null;
    };
    premiumPack: {
      status: OfferStatus;
      referencePriceKrw: number;
    };
  };
  box: {
    priceChips: number;
    fragmentRequirement: number;
    probabilityVersion: string;
    outcomes: Array<{ type: "fragment" | "cosmetic"; rarity: CosmeticRarity; probability: number }>;
  };
}

export interface BoxOutcome {
  type: "fragment" | "cosmetic";
  rarity: CosmeticRarity;
  cosmetic: EconomyCatalogItem | null;
  fragmentQuantity: number;
  overview: EconomyOverview;
}

export interface RewardIdentities {
  [playerId: string]: string;
}

export interface EconomyStore {
  readonly enabled: boolean;
  close(): Promise<void>;
  getOverview(accountId: string, attendanceStreak?: number): Promise<EconomyOverview>;
  getMatchCosmetics(accountId: string): Promise<MatchCosmetics | undefined>;
  claimWelcome(accountId: string, attendanceStreak?: number): Promise<EconomyOverview>;
  claimAttendance(
    accountId: string,
    attendedOn: string,
    attendanceStreak: number,
  ): Promise<EconomyOverview>;
  claimUnlockedQuest(
    accountId: string,
    questKey: "first_online_win",
    attendanceStreak?: number,
  ): Promise<EconomyOverview>;
  claimProgressQuest(
    accountId: string,
    questKey: "daily_complete" | "weekly_attendance" | "weekly_matches" | "weekly_wins" | "weekly_complete",
    attendanceStreak?: number,
  ): Promise<EconomyOverview>;
  purchaseWeeklyCosmetic(
    accountId: string,
    cosmeticId: string,
    attendanceStreak?: number,
  ): Promise<EconomyOverview>;
  openBox(accountId: string, category?: CraftCategory, attendanceStreak?: number): Promise<BoxOutcome>;
  combineFragments(
    accountId: string,
    rarity: CosmeticRarity,
    category?: CraftCategory,
    attendanceStreak?: number,
  ): Promise<BoxOutcome>;
  craftCosmetic(
    accountId: string,
    mode: "random" | "targeted",
    category: CraftCategory,
    rarity: CosmeticRarity,
    cosmeticId?: string,
    attendanceStreak?: number,
  ): Promise<BoxOutcome>;
  equipStyleCosmetic(
    accountId: string,
    slot: StyleLoadoutSlot,
    cosmeticId: string | null,
    attendanceStreak?: number,
  ): Promise<EconomyOverview>;
  setWishlist(
    accountId: string,
    cosmeticId: string,
    wished: boolean,
    attendanceStreak?: number,
  ): Promise<EconomyOverview>;
  equipTileColor(
    accountId: string,
    slot: TileLoadoutSlot,
    cosmeticId: string,
    allowSimilar?: boolean,
    attendanceStreak?: number,
  ): Promise<EconomyOverview>;
  resetTileColor(
    accountId: string,
    slot: TileLoadoutSlot,
    attendanceStreak?: number,
  ): Promise<EconomyOverview>;
  equipTileLoadout(
    accountId: string,
    loadout: TileLoadout,
    allowSimilar?: boolean,
    attendanceStreak?: number,
  ): Promise<EconomyOverview>;
  saveTilePalette(
    accountId: string,
    slotIndex: number,
    name: string | null,
    loadout: TileLoadout,
    allowSimilar?: boolean,
    attendanceStreak?: number,
  ): Promise<EconomyOverview>;
  deleteTilePalette(
    accountId: string,
    slotIndex: number,
    attendanceStreak?: number,
  ): Promise<EconomyOverview>;
  hasEntitlement(accountId: string, entitlement: "founder" | "premium"): Promise<boolean>;
  recordFinishedRoom(room: RoomSnapshot, rewardIdentities?: RewardIdentities): Promise<void>;
}

const rarities: CosmeticRarity[] = ["common", "rare", "epic", "legendary"];
export type CraftCategory = "tile_color" | "board_theme" | "placement_effect" | "score_effect" | "victory_effect";
export type StyleLoadoutSlot = "boardTheme" | "placementEffect" | "scoreEffect" | "victoryEffect";
const craftCategories: CraftCategory[] = ["tile_color", "board_theme", "placement_effect", "score_effect", "victory_effect"];
export const weeklyQuestGoals = {
  attendance: 5,
  matches: 20,
  wins: 10,
} as const;
const weeklyCounts: Record<CosmeticRarity, number> = {
  common: 5,
  rare: 4,
  epic: 3,
  legendary: 1,
};
export const boxPrice = 100;
export const fragmentRequirement = 4;
export const probabilityVersion = "20260629-v3";
export const boxOutcomes: EconomyOverview["box"]["outcomes"] = [
  { type: "fragment", rarity: "common", probability: 36 },
  { type: "fragment", rarity: "rare", probability: 24 },
  { type: "fragment", rarity: "epic", probability: 12 },
  { type: "fragment", rarity: "legendary", probability: 4 },
  { type: "cosmetic", rarity: "common", probability: 12 },
  { type: "cosmetic", rarity: "rare", probability: 7 },
  { type: "cosmetic", rarity: "epic", probability: 4 },
  { type: "cosmetic", rarity: "legendary", probability: 1 },
];

interface CatalogRow {
  id: string;
  category: CosmeticCategory;
  equip_slot: CosmeticEquipSlot;
  rarity: CosmeticRarity;
  name_ko: string;
  name_en: string;
  localized_names: Record<string, unknown> | null;
  description_ko: string;
  chip_price: number;
  visual_kind: EconomyCatalogItem["visualKind"];
  visual_config: { colors?: unknown; pattern?: unknown; splitAngle?: unknown; preset?: unknown } | null;
  collection_key: string | null;
  duration_ms: number | null;
  representative_color: string | null;
  availability: EconomyCatalogItem["availability"];
  owned: boolean;
  first_equipped_at: Date | null;
  wishlisted: boolean;
}

interface WalletRow {
  color_chips: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

interface FragmentRow {
  rarity: CosmeticRarity;
  quantity: number;
}

interface ConfigRow {
  monetization_enabled: boolean;
  reward_ads_enabled: boolean;
  founder_sale_starts_at: Date | null;
  founder_sale_ends_at: Date | null;
}

interface LedgerRow {
  id: string;
  delta: number;
  reason: string;
  balance_after: number;
  created_at: Date;
}

interface LoadoutRow {
  tile_color_a_id: string | null;
  tile_color_b_id: string | null;
  tile_color_c_id: string | null;
  board_theme_id: string | null;
  placement_effect_id: string | null;
  score_effect_id: string | null;
  victory_effect_id: string | null;
}

interface TilePaletteRow extends LoadoutRow {
  slot_index: number;
  name: string | null;
}

interface QuestRow {
  quest_key: Exclude<QuestKey, "online_matches" | "reward_ad">;
  cycle_key: string;
  reward_chips: number;
  reward_box_tickets: number;
  progress: number;
  goal: number;
  status: "unlocked" | "claimed";
}

const readColors = (config: CatalogRow["visual_config"]): string[] =>
  Array.isArray(config?.colors)
    ? config.colors.filter((value): value is string => typeof value === "string")
    : [];

const toCatalogItem = (
  row: CatalogRow,
  loadout: Partial<Record<TileLoadoutSlot, string>> = {},
): EconomyCatalogItem => ({
  id: row.id,
  category: row.category,
  equipSlot: row.equip_slot,
  rarity: row.rarity,
  nameKo: row.name_ko,
  nameEn: row.name_en,
  localizedNames: Object.fromEntries(
    Object.entries(row.localized_names ?? {})
      .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  ),
  descriptionKo: row.description_ko,
  chipPrice: row.chip_price,
  visualKind: row.visual_kind,
  colors: readColors(row.visual_config),
  pattern: typeof row.visual_config?.pattern === "string" ? row.visual_config.pattern : null,
  splitAngle: typeof row.visual_config?.splitAngle === "number"
    ? row.visual_config.splitAngle
    : null,
  preset: typeof row.visual_config?.preset === "string" ? row.visual_config.preset : null,
  durationMs: row.duration_ms,
  collectionKey: row.collection_key,
  representativeColor: row.representative_color,
  availability: row.availability,
  owned: row.owned,
  isNew: row.owned && row.first_equipped_at === null,
  equippedSlots: (Object.entries(loadout) as Array<[TileLoadoutSlot, string]>)
    .filter(([, id]) => id === row.id)
    .map(([slot]) => slot),
  wishlisted: row.wishlisted,
});

export const seoulDayKey = (now = new Date()): string => {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
};

export const seoulWeek = (now = new Date()): { weekKey: string; startsAt: Date; endsAt: Date } => {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const midnightUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  const day = shifted.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const startsAt = new Date(midnightUtc - daysSinceMonday * 86_400_000 - 9 * 60 * 60 * 1000);
  return {
    weekKey: new Date(midnightUtc - daysSinceMonday * 86_400_000).toISOString().slice(0, 10),
    startsAt,
    endsAt: new Date(startsAt.getTime() + 7 * 86_400_000),
  };
};

export const seoulQuestWeek = (now = new Date()): { weekKey: string; startsAt: Date; endsAt: Date } => {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const midnightUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  const daysSinceSunday = shifted.getUTCDay();
  const startsAt = new Date(midnightUtc - daysSinceSunday * 86_400_000 - 9 * 60 * 60 * 1000);
  return {
    weekKey: new Date(midnightUtc - daysSinceSunday * 86_400_000).toISOString().slice(0, 10),
    startsAt,
    endsAt: new Date(startsAt.getTime() + 7 * 86_400_000),
  };
};

const stableScore = (weekKey: string, id: string): string =>
  createHash("sha256").update(`${weekKey}:${id}`).digest("hex");

export const selectWeeklyCatalog = (
  catalog: Array<{ id: string; rarity: CosmeticRarity }>,
  weekKey: string,
): string[] => {
  const selected: string[] = [];
  for (const rarity of rarities) {
    selected.push(
      ...catalog
        .filter((item) => item.rarity === rarity)
        .sort((a, b) => stableScore(weekKey, a.id).localeCompare(stableScore(weekKey, b.id)))
        .slice(0, weeklyCounts[rarity])
        .map((item) => item.id),
    );
  }
  return selected;
};

export const selectWeeklyCatalogByCategory = (
  catalog: Array<{ id: string; category: CosmeticCategory; rarity: CosmeticRarity }>,
  weekKey: string,
): string[] => {
  const tile = selectWeeklyCatalog(
    catalog.filter((item) => item.category === "tile_color"),
    weekKey,
  );
  const epochWeek = Math.floor(Date.parse(`${weekKey}T00:00:00Z`) / (7 * 86_400_000));
  const legendaryWeek = epochWeek % 2 === 0;
  const selected = [...tile];
  for (const category of craftCategories.filter((entry) => entry !== "tile_color")) {
    const quotas: Partial<Record<CosmeticRarity, number>> = legendaryWeek
      ? { common: 2, rare: 1, epic: 1, legendary: 1 }
      : { common: 2, rare: 1, epic: 2 };
    for (const rarity of rarities) {
      selected.push(...catalog
        .filter((item) => item.category === category && item.rarity === rarity)
        .sort((a, b) => stableScore(`${weekKey}:${category}`, a.id).localeCompare(stableScore(`${weekKey}:${category}`, b.id)))
        .slice(0, quotas[rarity] ?? 0)
        .map((item) => item.id));
    }
  }
  return selected;
};

export const canRewardOnlineMatch = (
  dailyCount: number,
  sameOpponentCount: number,
  duplicateGame: boolean,
): boolean => !duplicateGame && dailyCount < 5 && sameOpponentCount < 2;

export const boxOutcomeForRoll = (
  roll: number,
): { type: "fragment" | "cosmetic"; rarity: CosmeticRarity } => {
  if (!Number.isInteger(roll) || roll < 0 || roll >= 10_000) throw new Error("INVALID_BOX_ROLL");
  let boundary = 0;
  for (const outcome of boxOutcomes) {
    boundary += outcome.probability * 100;
    if (roll < boundary) return { type: outcome.type, rarity: outcome.rarity };
  }
  throw new Error("INVALID_BOX_PROBABILITY");
};

const srgbToLinear = (value: number): number => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

export const hexToOklab = (hex: string): [number, number, number] => {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (match === null) throw new Error("INVALID_REPRESENTATIVE_COLOR");
  const r = srgbToLinear(Number.parseInt(match[1] ?? "0", 16));
  const g = srgbToLinear(Number.parseInt(match[2] ?? "0", 16));
  const b = srgbToLinear(Number.parseInt(match[3] ?? "0", 16));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

export const oklabDistance = (first: string, second: string): number => {
  const a = hexToOklab(first);
  const b = hexToOklab(second);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};

export const validateTileColorCombination = (
  items: Array<{
    id: string;
    representativeColor: string;
    slot?: TileLoadoutSlot;
  }>,
  allowSimilar = false,
): void => {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error("DUPLICATE_TILE_COLOR");
  }
  const conflicts: TileColorConflict[] = [];
  for (let first = 0; first < items.length; first += 1) {
    for (let second = first + 1; second < items.length; second += 1) {
      const left = items[first];
      const right = items[second];
      if (left !== undefined && right !== undefined) {
        const distance = oklabDistance(left.representativeColor, right.representativeColor);
        if (distance < 0.1) {
          conflicts.push({
            slots: [
              left.slot ?? (["colorA", "colorB", "colorC"][first] as TileLoadoutSlot),
              right.slot ?? (["colorA", "colorB", "colorC"][second] as TileLoadoutSlot),
            ],
            distance,
          });
        }
      }
    }
  }
  if (conflicts.length > 0 && !allowSimilar) {
    throw new TileColorSimilarityError(conflicts);
  }
};

export interface TileColorConflict {
  slots: [TileLoadoutSlot, TileLoadoutSlot];
  distance: number;
}

export class TileColorSimilarityError extends Error {
  readonly code = "TILE_COLORS_TOO_SIMILAR";

  constructor(readonly conflicts: TileColorConflict[]) {
    super("TILE_COLORS_TOO_SIMILAR");
    this.name = "TileColorSimilarityError";
  }
}

const defaultTileSafetyColors: Record<TileLoadoutSlot, string> = {
  colorA: "#b84d67",
  colorB: "#40558d",
  colorC: "#3d7b6d",
};

export const isRewardEligibleRoom = (room: RoomSnapshot): boolean =>
  room.game !== null
  && room.game.status === "finished"
  && (room.mode === "casual" || room.mode === "ranked")
  && room.game.turnNumber - 1 >= 6;

export class NullEconomyStore implements EconomyStore {
  readonly enabled = false;

  async close(): Promise<void> {}
  async getOverview(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async getMatchCosmetics(): Promise<undefined> { return undefined; }
  async claimWelcome(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async claimAttendance(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async claimUnlockedQuest(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async claimProgressQuest(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async purchaseWeeklyCosmetic(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async openBox(): Promise<BoxOutcome> { throw new Error("DATABASE_DISABLED"); }
  async combineFragments(): Promise<BoxOutcome> { throw new Error("DATABASE_DISABLED"); }
  async craftCosmetic(): Promise<BoxOutcome> { throw new Error("DATABASE_DISABLED"); }
  async equipStyleCosmetic(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async setWishlist(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async equipTileColor(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async resetTileColor(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async equipTileLoadout(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async saveTilePalette(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async deleteTilePalette(): Promise<EconomyOverview> { throw new Error("DATABASE_DISABLED"); }
  async hasEntitlement(): Promise<boolean> { return false; }
  async recordFinishedRoom(): Promise<void> {}
}

export class PostgresEconomyStore implements EconomyStore {
  readonly enabled = true;
  private readonly pool: Pool;

  constructor(connectionString: string, ssl: boolean) {
    const config: PoolConfig = { connectionString };
    if (ssl) config.ssl = { rejectUnauthorized: false };
    this.pool = new Pool(config);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async ensureAccount(client: PoolClient, accountId: string): Promise<void> {
    await client.query(
      `insert into economy_wallets (account_id) values ($1) on conflict (account_id) do nothing`,
      [accountId],
    );
    await client.query(
      `insert into account_loadouts (account_id) values ($1) on conflict (account_id) do nothing`,
      [accountId],
    );
    await client.query(
      `insert into account_palette_box_tickets (account_id) values ($1)
       on conflict (account_id) do nothing`,
      [accountId],
    );
    for (const rarity of rarities) {
      await client.query(
        `insert into economy_fragments (account_id, rarity) values ($1, $2)
         on conflict (account_id, rarity) do nothing`,
        [accountId, rarity],
      );
    }
    await client.query(
      `insert into economy_quest_unlocks (
         account_id, quest_key, cycle_key, reward_chips, progress, goal
       ) values ($1, 'welcome', 'once', 100, 1, 1)
       on conflict (account_id, quest_key, cycle_key) do nothing`,
      [accountId],
    );
  }

  private async lockWallet(client: PoolClient, accountId: string): Promise<void> {
    await client.query(`select 1 from economy_wallets where account_id = $1 for update`, [accountId]);
  }

  private async credit(
    client: PoolClient,
    accountId: string,
    amount: number,
    reason: string,
    sourceKey: string,
    metadata: Record<string, unknown> = {},
  ): Promise<boolean> {
    const duplicate = await client.query(
      `select 1 from economy_wallet_ledger where account_id = $1 and source_key = $2`,
      [accountId, sourceKey],
    );
    if ((duplicate.rowCount ?? 0) > 0) return false;
    const wallet = await client.query<WalletRow>(
      `update economy_wallets set
         color_chips = color_chips + $2,
         lifetime_earned = lifetime_earned + $2,
         updated_at = now()
       where account_id = $1
       returning color_chips, lifetime_earned, lifetime_spent`,
      [accountId, amount],
    );
    const row = wallet.rows[0];
    if (row === undefined) throw new Error("ECONOMY_WALLET_NOT_FOUND");
    await client.query(
      `insert into economy_wallet_ledger (
         account_id, delta, reason, source_key, balance_after, metadata
       ) values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [accountId, amount, reason, sourceKey, row.color_chips, JSON.stringify(metadata)],
    );
    return true;
  }

  private async debit(
    client: PoolClient,
    accountId: string,
    amount: number,
    reason: string,
    sourceKey: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const wallet = await client.query<WalletRow>(
      `update economy_wallets set
         color_chips = color_chips - $2,
         lifetime_spent = lifetime_spent + $2,
         updated_at = now()
       where account_id = $1 and color_chips >= $2
       returning color_chips, lifetime_earned, lifetime_spent`,
      [accountId, amount],
    );
    const row = wallet.rows[0];
    if (row === undefined) throw new Error("INSUFFICIENT_CHIPS");
    await client.query(
      `insert into economy_wallet_ledger (
         account_id, delta, reason, source_key, balance_after, metadata
       ) values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [accountId, -amount, reason, sourceKey, row.color_chips, JSON.stringify(metadata)],
    );
  }

  private async ensureWeeklyRotation(client: PoolClient): Promise<ReturnType<typeof seoulWeek>> {
    const week = seoulWeek();
    await client.query(
      `insert into weekly_store_rotations (week_key, starts_at, ends_at)
       values ($1, $2, $3) on conflict (week_key) do nothing`,
      [week.weekKey, week.startsAt, week.endsAt],
    );
    const catalog = await client.query<{ id: string; category: CosmeticCategory; rarity: CosmeticRarity }>(
      `select id, category, rarity from cosmetic_catalog
       where active and availability = 'active' and available_in_weekly_store`,
    );
    const selected = selectWeeklyCatalogByCategory(catalog.rows, week.weekKey);
    for (const [order, cosmeticId] of selected.entries()) {
      await client.query(
        `insert into weekly_store_items (week_key, cosmetic_id, display_order)
         values ($1, $2, $3) on conflict do nothing`,
        [week.weekKey, cosmeticId, order],
      );
    }
    return week;
  }

  private async readCatalog(
    client: PoolClient,
    accountId: string,
    suffix: string,
    params: unknown[],
  ): Promise<CatalogRow[]> {
    const result = await client.query<CatalogRow>(
      `select c.id, c.category, c.equip_slot, c.rarity, c.name_ko, c.name_en, c.localized_names,
              c.description_ko, c.chip_price, c.visual_kind, c.visual_config,
              c.representative_color, c.availability, c.collection_key, c.duration_ms,
              ac_owned.first_equipped_at,
              exists (
                select 1 from account_cosmetic_wishlist aw
                where aw.account_id = $1 and aw.cosmetic_id = c.id
              ) as wishlisted,
              exists (
                select 1 from account_cosmetics ac
                where ac.account_id = $1 and ac.cosmetic_id = c.id
              ) as owned
       from cosmetic_catalog c
       left join account_cosmetics ac_owned
         on ac_owned.account_id = $1 and ac_owned.cosmetic_id = c.id
       ${suffix}`,
      [accountId, ...params],
    );
    return result.rows;
  }

  private loadoutFromRow(row: LoadoutRow | undefined): TileLoadout {
    const loadout: TileLoadout = {};
    if (row?.tile_color_a_id) loadout.colorA = row.tile_color_a_id;
    if (row?.tile_color_b_id) loadout.colorB = row.tile_color_b_id;
    if (row?.tile_color_c_id) loadout.colorC = row.tile_color_c_id;
    return loadout;
  }

  private styleLoadoutFromRow(row: LoadoutRow | undefined): StyleLoadout {
    const loadout: StyleLoadout = {};
    if (row?.board_theme_id) loadout.boardTheme = row.board_theme_id;
    if (row?.placement_effect_id) loadout.placementEffect = row.placement_effect_id;
    if (row?.score_effect_id) loadout.scoreEffect = row.score_effect_id;
    if (row?.victory_effect_id) loadout.victoryEffect = row.victory_effect_id;
    return loadout;
  }

  private async readLoadout(client: PoolClient, accountId: string): Promise<TileLoadout> {
    const result = await client.query<LoadoutRow>(
      `select tile_color_a_id, tile_color_b_id, tile_color_c_id,
              board_theme_id, placement_effect_id, score_effect_id, victory_effect_id
       from account_loadouts where account_id = $1`,
      [accountId],
    );
    return this.loadoutFromRow(result.rows[0]);
  }

  private async readTilePalettes(client: PoolClient, accountId: string): Promise<TilePalettePreset[]> {
    const result = await client.query<TilePaletteRow>(
      `select slot_index, name, tile_color_a_id, tile_color_b_id, tile_color_c_id
       from account_tile_palettes where account_id = $1 order by slot_index`,
      [accountId],
    );
    return result.rows.map((row) => ({
      slotIndex: row.slot_index,
      name: row.name,
      loadout: this.loadoutFromRow(row),
    }));
  }

  private async overviewWithClient(
    client: PoolClient,
    accountId: string,
  ): Promise<EconomyOverview> {
    await this.ensureAccount(client, accountId);
    const storeWeek = await this.ensureWeeklyRotation(client);
    const questWeek = seoulQuestWeek();
    const dayKey = seoulDayKey();
    const loadout = await this.readLoadout(client, accountId);
    const loadoutResult = await client.query<LoadoutRow>(
      `select tile_color_a_id, tile_color_b_id, tile_color_c_id,
              board_theme_id, placement_effect_id, score_effect_id, victory_effect_id
       from account_loadouts where account_id = $1`,
      [accountId],
    );
    const styleLoadout = this.styleLoadoutFromRow(loadoutResult.rows[0]);
    const [
      walletResult,
      ticketResult,
      fragmentResult,
      weeklyRows,
      catalogRows,
      inventoryRows,
      ledgerResult,
      configResult,
      entitlementResult,
      questResult,
      matchCount,
      adCount,
      todayAttendance,
      weeklyAttendance,
      weeklyMatches,
      weeklyWins,
      products,
      tilePalettes,
    ] = await Promise.all([
      client.query<WalletRow>(`select * from economy_wallets where account_id = $1`, [accountId]),
      client.query<{ quantity: number }>(
        `select quantity from account_palette_box_tickets where account_id = $1`,
        [accountId],
      ),
      client.query<FragmentRow>(
        `select rarity, quantity from economy_fragments where account_id = $1`,
        [accountId],
      ),
      this.readCatalog(
        client,
        accountId,
        `join weekly_store_items w on w.cosmetic_id = c.id
         where w.week_key = $2 and c.active order by w.display_order`,
        [storeWeek.weekKey],
      ),
      this.readCatalog(
        client,
        accountId,
        `where c.active and c.category in ('tile_color','board_theme','placement_effect','score_effect','victory_effect')
           and c.availability = 'active'
         order by
           case c.rarity
             when 'common' then 1
             when 'rare' then 2
             when 'epic' then 3
             when 'legendary' then 4
           end,
           c.name_ko`,
        [],
      ),
      this.readCatalog(
        client,
        accountId,
        `join account_cosmetics ac on ac.cosmetic_id = c.id and ac.account_id = $1
         where c.active order by c.rarity, c.name_ko`,
        [],
      ),
      client.query<LedgerRow>(
        `select id::text, delta, reason, balance_after, created_at
         from economy_wallet_ledger where account_id = $1
         order by created_at desc limit 20`,
        [accountId],
      ),
      client.query<ConfigRow>(`select * from monetization_config where id = true`),
      client.query<{ entitlement: string }>(
        `select entitlement from account_entitlements
         where account_id = $1 and status = 'active'`,
        [accountId],
      ),
      client.query<QuestRow>(
        `select quest_key, cycle_key, reward_chips, reward_box_tickets, progress, goal, status
         from economy_quest_unlocks
         where account_id = $1
         order by case status when 'unlocked' then 0 else 1 end, unlocked_at`,
        [accountId],
      ),
      client.query<{ count: string }>(
        `select count(*)::text as count from economy_match_rewards
         where account_id = $1 and day_key = $2`,
        [accountId, dayKey],
      ),
      client.query<{ count: string }>(
        `select count(*)::text as count from ad_reward_sessions
         where account_id = $1 and day_key = $2 and status = 'verified'`,
        [accountId, dayKey],
      ),
      client.query<{ count: string }>(
        `select count(*)::text as count from attendance_days
         where account_id = $1 and attended_on = $2::date`,
        [accountId, dayKey],
      ),
      client.query<{ count: string }>(
        `select count(*)::text as count from attendance_days
         where account_id = $1 and attended_on >= $2::date and attended_on < $3::date`,
        [accountId, questWeek.weekKey, seoulDayKey(questWeek.endsAt)],
      ),
      client.query<{ count: string }>(
        `select count(*)::text as count from economy_match_rewards
         where account_id = $1 and day_key >= $2 and day_key < $3`,
        [accountId, questWeek.weekKey, seoulDayKey(questWeek.endsAt)],
      ),
      client.query<{ count: string }>(
        `select count(*)::text as count from economy_match_rewards
         where account_id = $1 and day_key >= $2 and day_key < $3 and won`,
        [accountId, questWeek.weekKey, seoulDayKey(questWeek.endsAt)],
      ),
      client.query<{ id: "founder_pack" | "premium_pack"; reference_price_krw: number; bonus_chips: number }>(
        `select id, reference_price_krw, bonus_chips from monetization_products where active`,
      ),
      this.readTilePalettes(client, accountId),
    ]);

    const fragments = Object.fromEntries(rarities.map((rarity) => [rarity, 0])) as Record<CosmeticRarity, number>;
    for (const row of fragmentResult.rows) fragments[row.rarity] = row.quantity;
    const wallet = walletResult.rows[0] ?? { color_chips: 0, lifetime_earned: 0, lifetime_spent: 0 };
    const matchProgress = Number.parseInt(matchCount.rows[0]?.count ?? "0", 10);
    const adProgress = Number.parseInt(adCount.rows[0]?.count ?? "0", 10);
    const attendedToday = Number.parseInt(todayAttendance.rows[0]?.count ?? "0", 10) > 0;
    const weeklyAttendanceProgress = Number.parseInt(weeklyAttendance.rows[0]?.count ?? "0", 10);
    const weeklyMatchProgress = Number.parseInt(weeklyMatches.rows[0]?.count ?? "0", 10);
    const weeklyWinProgress = Number.parseInt(weeklyWins.rows[0]?.count ?? "0", 10);
    const quests = questResult.rows;
    const currentAttendance = quests.find(
      (quest) => quest.quest_key === "attendance" && quest.cycle_key === dayKey,
    );
    const welcome = quests.find((quest) => quest.quest_key === "welcome");
    const firstWin = quests.find(
      (quest) => quest.quest_key === "first_online_win" && quest.cycle_key === dayKey,
    );
    const dailyComplete = quests.find(
      (quest) => quest.quest_key === "daily_complete" && quest.cycle_key === dayKey,
    );
    const weeklyAttendanceQuest = quests.find(
      (quest) => quest.quest_key === "weekly_attendance" && quest.cycle_key === questWeek.weekKey,
    );
    const weeklyMatchesQuest = quests.find(
      (quest) => quest.quest_key === "weekly_matches" && quest.cycle_key === questWeek.weekKey,
    );
    const weeklyWinsQuest = quests.find(
      (quest) => quest.quest_key === "weekly_wins" && quest.cycle_key === questWeek.weekKey,
    );
    const weeklyComplete = quests.find(
      (quest) => quest.quest_key === "weekly_complete" && quest.cycle_key === questWeek.weekKey,
    );
    const dailyObjectivesComplete = attendedToday && matchProgress >= 5 && firstWin !== undefined;
    const weeklyObjectivesComplete =
      weeklyAttendanceProgress >= weeklyQuestGoals.attendance
      && weeklyMatchProgress >= weeklyQuestGoals.matches
      && weeklyWinProgress >= weeklyQuestGoals.wins;
    const config = configResult.rows[0];
    const now = new Date();
    const startsAt = config?.founder_sale_starts_at ?? null;
    const endsAt = config?.founder_sale_ends_at ?? null;
    const monetizationEnabled = config?.monetization_enabled ?? false;
    const founderStatus: OfferStatus = startsAt === null
      ? "upcoming"
      : now < startsAt
        ? "upcoming"
        : endsAt !== null && now >= endsAt
          ? "ended"
          : monetizationEnabled
            ? "available"
            : "upcoming";
    const premiumStatus: OfferStatus = endsAt !== null && now >= endsAt && monetizationEnabled
      ? "available"
      : "upcoming";
    const founderProduct = products.rows.find((product) => product.id === "founder_pack");
    const premiumProduct = products.rows.find((product) => product.id === "premium_pack");
    const catalogWithLoadout = (rows: CatalogRow[]) => rows.map((row) => toCatalogItem(row, loadout));

    return {
      wallet: {
        colorChips: wallet.color_chips,
        lifetimeEarned: wallet.lifetime_earned,
        lifetimeSpent: wallet.lifetime_spent,
      },
      boxTickets: ticketResult.rows[0]?.quantity ?? 0,
      fragments,
      weeklyStore: {
        weekKey: storeWeek.weekKey,
        endsAt: storeWeek.endsAt.toISOString(),
        items: catalogWithLoadout(weeklyRows),
      },
      attendance: {
        dayKey,
        weekKey: questWeek.weekKey,
        weekStartsAt: questWeek.startsAt.toISOString(),
        weekEndsAt: questWeek.endsAt.toISOString(),
        attendedToday,
        weeklyCount: weeklyAttendanceProgress,
        weeklyGoal: weeklyQuestGoals.attendance,
      },
      catalog: catalogWithLoadout(catalogRows),
      inventory: catalogWithLoadout(inventoryRows),
      loadout,
      styleLoadout,
      wishlist: catalogWithLoadout(catalogRows).filter((item) => item.wishlisted).map((item) => item.id),
      tilePalettes,
      upcomingCategories: ["profile"],
      quests: [
        {
          key: "welcome",
          period: "once",
          cycleKey: "once",
          rewardChips: 100,
          rewardBoxTickets: 0,
          claimed: welcome?.status === "claimed",
          claimable: welcome?.status === "unlocked",
          progress: 1,
          goal: 1,
        },
        {
          key: "attendance",
          period: "daily",
          cycleKey: dayKey,
          rewardChips: 5,
          rewardBoxTickets: 0,
          claimed: currentAttendance?.status === "claimed",
          claimable: currentAttendance === undefined,
          progress: currentAttendance?.status === "claimed" ? 1 : 0,
          goal: 1,
        },
        {
          key: "online_matches",
          period: "daily",
          cycleKey: dayKey,
          rewardChips: 4,
          rewardBoxTickets: 0,
          claimed: matchProgress >= 5,
          claimable: false,
          progress: Math.min(matchProgress, 5),
          goal: 5,
        },
        {
          key: "first_online_win",
          period: "daily",
          cycleKey: firstWin?.cycle_key ?? dayKey,
          rewardChips: 8,
          rewardBoxTickets: 0,
          claimed: firstWin?.status === "claimed",
          claimable: firstWin?.status === "unlocked",
          progress: firstWin === undefined ? 0 : 1,
          goal: 1,
        },
        {
          key: "daily_complete",
          period: "daily",
          cycleKey: dayKey,
          rewardChips: 0,
          rewardBoxTickets: 1,
          claimed: dailyComplete?.status === "claimed",
          claimable: dailyObjectivesComplete && dailyComplete?.status !== "claimed",
          progress: [attendedToday, matchProgress >= 5, firstWin !== undefined].filter(Boolean).length,
          goal: 3,
        },
        {
          key: "weekly_attendance",
          period: "weekly",
          cycleKey: questWeek.weekKey,
          rewardChips: 50,
          rewardBoxTickets: 0,
          claimed: weeklyAttendanceQuest?.status === "claimed",
          claimable:
            weeklyAttendanceProgress >= weeklyQuestGoals.attendance
            && weeklyAttendanceQuest?.status !== "claimed",
          progress: Math.min(weeklyAttendanceProgress, weeklyQuestGoals.attendance),
          goal: weeklyQuestGoals.attendance,
        },
        {
          key: "weekly_matches",
          period: "weekly",
          cycleKey: questWeek.weekKey,
          rewardChips: 100,
          rewardBoxTickets: 0,
          claimed: weeklyMatchesQuest?.status === "claimed",
          claimable:
            weeklyMatchProgress >= weeklyQuestGoals.matches
            && weeklyMatchesQuest?.status !== "claimed",
          progress: Math.min(weeklyMatchProgress, weeklyQuestGoals.matches),
          goal: weeklyQuestGoals.matches,
        },
        {
          key: "weekly_wins",
          period: "weekly",
          cycleKey: questWeek.weekKey,
          rewardChips: 150,
          rewardBoxTickets: 0,
          claimed: weeklyWinsQuest?.status === "claimed",
          claimable:
            weeklyWinProgress >= weeklyQuestGoals.wins
            && weeklyWinsQuest?.status !== "claimed",
          progress: Math.min(weeklyWinProgress, weeklyQuestGoals.wins),
          goal: weeklyQuestGoals.wins,
        },
        {
          key: "weekly_complete",
          period: "weekly",
          cycleKey: questWeek.weekKey,
          rewardChips: 0,
          rewardBoxTickets: 1,
          claimed: weeklyComplete?.status === "claimed",
          claimable: weeklyObjectivesComplete && weeklyComplete?.status !== "claimed",
          progress: [
            weeklyAttendanceProgress >= weeklyQuestGoals.attendance,
            weeklyMatchProgress >= weeklyQuestGoals.matches,
            weeklyWinProgress >= weeklyQuestGoals.wins,
          ].filter(Boolean).length,
          goal: 3,
        },
        {
          key: "reward_ad",
          period: "daily",
          cycleKey: dayKey,
          rewardChips: 12,
          rewardBoxTickets: 0,
          claimed: adProgress >= 3,
          claimable: false,
          progress: Math.min(adProgress, 3),
          goal: 3,
        },
      ],
      ledger: ledgerResult.rows.map((row) => ({
        id: row.id,
        delta: row.delta,
        reason: row.reason,
        balanceAfter: row.balance_after,
        createdAt: row.created_at.toISOString(),
      })),
      entitlements: entitlementResult.rows.map((row) => row.entitlement),
      monetization: {
        rewardAds: {
          status: monetizationEnabled && (config?.reward_ads_enabled ?? false) ? "available" : "upcoming",
          rewardChips: 12,
          dailyLimit: 3,
          usedToday: adProgress,
        },
        founderPack: {
          status: founderStatus,
          referencePriceKrw: founderProduct?.reference_price_krw ?? 9900,
          bonusChips: founderProduct?.bonus_chips ?? 500,
          startsAt: startsAt?.toISOString() ?? null,
          endsAt: endsAt?.toISOString() ?? null,
        },
        premiumPack: {
          status: premiumStatus,
          referencePriceKrw: premiumProduct?.reference_price_krw ?? 6900,
        },
      },
      box: {
        priceChips: boxPrice,
        fragmentRequirement,
        probabilityVersion,
        outcomes: boxOutcomes,
      },
    };
  }

  async getOverview(accountId: string, _attendanceStreak = 0): Promise<EconomyOverview> {
    const client = await this.pool.connect();
    try {
      return await this.overviewWithClient(client, accountId);
    } finally {
      client.release();
    }
  }

  private async claimQuestRow(
    client: PoolClient,
    accountId: string,
    questKey: QuestRow["quest_key"],
    cycleKey: string,
  ): Promise<void> {
    const result = await client.query<{ reward_chips: number; reward_box_tickets: number }>(
      `update economy_quest_unlocks set status = 'claimed', claimed_at = now()
       where account_id = $1 and quest_key = $2 and cycle_key = $3 and status = 'unlocked'
       returning reward_chips, reward_box_tickets`,
      [accountId, questKey, cycleKey],
    );
    const reward = result.rows[0];
    if (reward === undefined) throw new Error("QUEST_ALREADY_CLAIMED");
    if (reward.reward_chips > 0) {
      await this.credit(
        client,
        accountId,
        reward.reward_chips,
        `quest_${questKey}`,
        `quest:${questKey}:${cycleKey}`,
        { cycleKey },
      );
    }
    if (reward.reward_box_tickets > 0) {
      await client.query(
        `update account_palette_box_tickets
         set quantity = quantity + $2, updated_at = now()
         where account_id = $1`,
        [accountId, reward.reward_box_tickets],
      );
    }
  }

  async claimWelcome(accountId: string, attendanceStreak = 0): Promise<EconomyOverview> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      await this.lockWallet(client, accountId);
      await this.claimQuestRow(client, accountId, "welcome", "once");
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  async claimAttendance(
    accountId: string,
    attendedOn: string,
    attendanceStreak: number,
  ): Promise<EconomyOverview> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      await this.lockWallet(client, accountId);
      const created = await client.query(
        `insert into economy_quest_unlocks (
           account_id, quest_key, cycle_key, reward_chips, progress, goal
         ) values ($1, 'attendance', $2, 5, 1, 1)
         on conflict (account_id, quest_key, cycle_key) do nothing`,
        [accountId, attendedOn],
      );
      if ((created.rowCount ?? 0) === 0) throw new Error("QUEST_ALREADY_CLAIMED");
      await this.claimQuestRow(client, accountId, "attendance", attendedOn);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  async claimUnlockedQuest(
    accountId: string,
    questKey: "first_online_win",
    attendanceStreak = 0,
  ): Promise<EconomyOverview> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      await this.lockWallet(client, accountId);
      const pending = await client.query<{ cycle_key: string }>(
        `select cycle_key from economy_quest_unlocks
         where account_id = $1 and quest_key = $2 and status = 'unlocked'
         order by unlocked_at for update skip locked limit 1`,
        [accountId, questKey],
      );
      const cycleKey = pending.rows[0]?.cycle_key;
      if (cycleKey === undefined) throw new Error("QUEST_NOT_CLAIMABLE");
      await this.claimQuestRow(client, accountId, questKey, cycleKey);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  async getMatchCosmetics(accountId: string): Promise<MatchCosmetics | undefined> {
    const result = await this.pool.query<{
      id: string;
      equip_slot: "placement_effect" | "score_effect";
      visual_config: CatalogRow["visual_config"];
      duration_ms: number | null;
    }>(
      `select c.id, c.equip_slot, c.visual_config, c.duration_ms
       from account_loadouts l
       join cosmetic_catalog c
         on c.id = l.placement_effect_id or c.id = l.score_effect_id
       where l.account_id = $1 and c.active
         and c.availability in ('active', 'pack_only')
         and c.equip_slot in ('placement_effect', 'score_effect')`,
      [accountId],
    );
    const cosmetics: MatchCosmetics = {};
    for (const row of result.rows) {
      const visual = {
        id: row.id,
        preset: typeof row.visual_config?.preset === "string"
          ? row.visual_config.preset
          : "default",
        colors: readColors(row.visual_config),
        durationMs: row.duration_ms ?? (row.equip_slot === "placement_effect" ? 240 : 450),
      };
      if (row.equip_slot === "placement_effect") cosmetics.placementEffect = visual;
      if (row.equip_slot === "score_effect") cosmetics.scoreEffect = visual;
    }
    return cosmetics.placementEffect === undefined && cosmetics.scoreEffect === undefined
      ? undefined
      : cosmetics;
  }

  async claimProgressQuest(
    accountId: string,
    questKey: "daily_complete" | "weekly_attendance" | "weekly_matches" | "weekly_wins" | "weekly_complete",
    attendanceStreak = 0,
  ): Promise<EconomyOverview> {
    const overview = await this.getOverview(accountId, attendanceStreak);
    const quest = overview.quests.find((entry) => entry.key === questKey);
    if (quest === undefined || !quest.claimable) throw new Error("QUEST_NOT_CLAIMABLE");

    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      await this.lockWallet(client, accountId);
      await client.query(
        `insert into economy_quest_unlocks (
           account_id, quest_key, cycle_key, reward_chips, reward_box_tickets, progress, goal
         ) values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (account_id, quest_key, cycle_key) do nothing`,
        [
          accountId,
          questKey,
          quest.cycleKey,
          quest.rewardChips,
          quest.rewardBoxTickets,
          quest.goal,
          quest.goal,
        ],
      );
      await this.claimQuestRow(client, accountId, questKey, quest.cycleKey);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  async purchaseWeeklyCosmetic(
    accountId: string,
    cosmeticId: string,
    attendanceStreak = 0,
  ): Promise<EconomyOverview> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      await this.lockWallet(client, accountId);
      const week = await this.ensureWeeklyRotation(client);
      const item = await client.query<{ chip_price: number }>(
        `select c.chip_price from cosmetic_catalog c
         join weekly_store_items w on w.cosmetic_id = c.id
         where w.week_key = $1 and c.id = $2 and c.active and c.availability = 'active'`,
        [week.weekKey, cosmeticId],
      );
      const price = item.rows[0]?.chip_price;
      if (price === undefined) throw new Error("COSMETIC_NOT_IN_WEEKLY_STORE");
      const owned = await client.query(
        `select 1 from account_cosmetics where account_id = $1 and cosmetic_id = $2`,
        [accountId, cosmeticId],
      );
      if ((owned.rowCount ?? 0) > 0) throw new Error("COSMETIC_ALREADY_OWNED");
      const purchaseId = randomUUID();
      await this.debit(client, accountId, price, "weekly_store", `store:${purchaseId}`, {
        cosmeticId,
        weekKey: week.weekKey,
      });
      await client.query(
        `insert into account_cosmetics (account_id, cosmetic_id, source)
         values ($1, $2, 'weekly_store')`,
        [accountId, cosmeticId],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  private async grantRandomCosmetic(
    client: PoolClient,
    accountId: string,
    rarity: CosmeticRarity,
    source: string,
    category?: CraftCategory,
  ): Promise<CatalogRow | null> {
    const candidates = await this.readCatalog(
      client,
      accountId,
      `where c.active and c.availability = 'active' and c.available_in_boxes
         and c.rarity = $2
         and ($3::text is null or c.category = $3)
         and not exists (
           select 1 from account_cosmetics ac
           where ac.account_id = $1 and ac.cosmetic_id = c.id
         )`,
      [rarity, category ?? null],
    );
    if (candidates.length === 0) return null;
    const cosmetic = candidates[randomInt(candidates.length)];
    if (cosmetic === undefined) return null;
    await client.query(
      `insert into account_cosmetics (account_id, cosmetic_id, source)
       values ($1, $2, $3) on conflict do nothing`,
      [accountId, cosmetic.id, source],
    );
    return cosmetic;
  }

  async openBox(
    accountId: string,
    category: CraftCategory = "tile_color",
    attendanceStreak = 0,
  ): Promise<BoxOutcome> {
    const client = await this.pool.connect();
    let result!: Omit<BoxOutcome, "overview">;
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      await this.lockWallet(client, accountId);
      const openingId = randomUUID();
      const ticket = await client.query(
        `update account_palette_box_tickets
         set quantity = quantity - 1, updated_at = now()
         where account_id = $1 and quantity > 0 returning quantity`,
        [accountId],
      );
      const usedTicket = (ticket.rowCount ?? 0) > 0;
      if (!usedTicket) {
        await this.debit(client, accountId, boxPrice, "palette_box", `box:${openingId}`, {
          probabilityVersion,
        });
      }
      const roll = randomInt(10_000);
      const selected = boxOutcomeForRoll(roll);
      let cosmetic: CatalogRow | null = null;
      if (selected.type === "cosmetic") {
        cosmetic = await this.grantRandomCosmetic(client, accountId, selected.rarity, "palette_box", category);
      }
      const fragmentQuantity = selected.type === "fragment" || cosmetic === null ? 1 : 0;
      if (fragmentQuantity > 0) {
        await client.query(
          `update economy_fragments set quantity = quantity + 1, updated_at = now()
           where account_id = $1 and rarity = $2`,
          [accountId, selected.rarity],
        );
      }
      await client.query(
        `insert into cosmetic_box_openings (
           id, account_id, price_chips, outcome_type, rarity, cosmetic_id,
           fragment_quantity, probability_version, roll, payment_method, category
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          openingId,
          accountId,
          usedTicket ? 0 : boxPrice,
          cosmetic === null ? "fragment" : "cosmetic",
          selected.rarity,
          cosmetic?.id ?? null,
          fragmentQuantity,
          probabilityVersion,
          roll,
          usedTicket ? "ticket" : "chips",
          category,
        ],
      );
      result = {
        type: cosmetic === null ? "fragment" : "cosmetic",
        rarity: selected.rarity,
        cosmetic: cosmetic === null ? null : toCatalogItem(cosmetic),
        fragmentQuantity,
      };
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return { ...result, overview: await this.getOverview(accountId, attendanceStreak) };
  }

  async combineFragments(
    accountId: string,
    rarity: CosmeticRarity,
    category: CraftCategory = "tile_color",
    attendanceStreak = 0,
  ): Promise<BoxOutcome> {
    const client = await this.pool.connect();
    let cosmetic!: CatalogRow;
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      await this.lockWallet(client, accountId);
      const available = await client.query(
        `update economy_fragments set quantity = quantity - $3, updated_at = now()
         where account_id = $1 and rarity = $2 and quantity >= $3 returning quantity`,
        [accountId, rarity, fragmentRequirement],
      );
      if ((available.rowCount ?? 0) === 0) throw new Error("NOT_ENOUGH_FRAGMENTS");
      const granted = await this.grantRandomCosmetic(client, accountId, rarity, "fragment_combine", category);
      if (granted === null) throw new Error("NO_UNOWNED_COSMETICS");
      cosmetic = granted;
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return {
      type: "cosmetic",
      rarity,
      cosmetic: toCatalogItem(cosmetic),
      fragmentQuantity: 0,
      overview: await this.getOverview(accountId, attendanceStreak),
    };
  }

  async craftCosmetic(
    accountId: string,
    mode: "random" | "targeted",
    category: CraftCategory,
    rarity: CosmeticRarity,
    cosmeticId?: string,
    attendanceStreak = 0,
  ): Promise<BoxOutcome> {
    const client = await this.pool.connect();
    const cost = mode === "targeted" ? 8 : 4;
    let cosmetic!: CatalogRow;
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      const spent = await client.query(
        `update economy_fragments set quantity = quantity - $3, updated_at = now()
         where account_id = $1 and rarity = $2 and quantity >= $3 returning quantity`,
        [accountId, rarity, cost],
      );
      if ((spent.rowCount ?? 0) === 0) throw new Error("NOT_ENOUGH_FRAGMENTS");
      if (mode === "random") {
        const granted = await this.grantRandomCosmetic(client, accountId, rarity, "atelier_random", category);
        if (granted === null) throw new Error("NO_UNOWNED_COSMETICS");
        cosmetic = granted;
      } else {
        if (!cosmeticId) throw new Error("COSMETIC_REQUIRED");
        const rows = await this.readCatalog(
          client,
          accountId,
          `where c.id = $2 and c.category = $3 and c.rarity = $4
             and c.active and c.availability = 'active'
             and not exists (
               select 1 from account_cosmetics ac
               where ac.account_id = $1 and ac.cosmetic_id = c.id
             )`,
          [cosmeticId, category, rarity],
        );
        const selected = rows[0];
        if (selected === undefined) throw new Error("COSMETIC_NOT_CRAFTABLE");
        await client.query(
          `insert into account_cosmetics (account_id, cosmetic_id, source)
           values ($1, $2, 'atelier_targeted')`,
          [accountId, selected.id],
        );
        cosmetic = selected;
      }
      await client.query(
        `insert into cosmetic_craft_history (
           id, account_id, mode, category, rarity, cosmetic_id, fragments_spent
         ) values ($1, $2, $3, $4, $5, $6, $7)`,
        [randomUUID(), accountId, mode, category, rarity, cosmetic.id, cost],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return {
      type: "cosmetic",
      rarity,
      cosmetic: toCatalogItem(cosmetic),
      fragmentQuantity: 0,
      overview: await this.getOverview(accountId, attendanceStreak),
    };
  }

  private async validateOwnedTileLoadout(
    client: PoolClient,
    accountId: string,
    loadout: TileLoadout,
    allowSimilar: boolean,
  ): Promise<string[]> {
    const selectedIds = Object.values(loadout);
    const uniqueIds = [...new Set(selectedIds)];
    const selectedRows = uniqueIds.length === 0
      ? []
      : (await client.query<{ id: string; representative_color: string | null }>(
          `select c.id, c.representative_color
           from cosmetic_catalog c
           join account_cosmetics ac on ac.cosmetic_id = c.id
           where ac.account_id = $1 and c.id = any($2::text[]) and c.active
             and c.equip_slot = 'tile_color' and c.availability in ('active', 'pack_only')`,
          [accountId, uniqueIds],
        )).rows;
    if (
      selectedRows.length !== uniqueIds.length
      || selectedRows.some((row) => row.representative_color === null)
    ) {
      throw new Error("COSMETIC_NOT_OWNED");
    }
    const selectedById = new Map(
      selectedRows.map((row) => [row.id, row.representative_color as string]),
    );
    validateTileColorCombination(
      (["colorA", "colorB", "colorC"] as const).map((slot) => {
        const id = loadout[slot];
        return id === undefined
          ? {
              id: `default:${slot}`,
              representativeColor: defaultTileSafetyColors[slot],
              slot,
            }
          : {
              id,
              representativeColor: selectedById.get(id) ?? defaultTileSafetyColors[slot],
              slot,
            };
      }),
      allowSimilar,
    );
    return uniqueIds;
  }

  private async writeTileLoadout(
    client: PoolClient,
    accountId: string,
    loadout: TileLoadout,
    selectedIds: string[],
  ): Promise<void> {
    await client.query(
      `update account_loadouts
       set tile_color_a_id = $2,
           tile_color_b_id = $3,
           tile_color_c_id = $4,
           updated_at = now()
       where account_id = $1`,
      [
        accountId,
        loadout.colorA ?? null,
        loadout.colorB ?? null,
        loadout.colorC ?? null,
      ],
    );
    if (selectedIds.length > 0) {
      await client.query(
        `update account_cosmetics
         set first_equipped_at = coalesce(first_equipped_at, now())
         where account_id = $1 and cosmetic_id = any($2::text[])`,
        [accountId, selectedIds],
      );
    }
  }

  async equipTileColor(
    accountId: string,
    slot: TileLoadoutSlot,
    cosmeticId: string,
    allowSimilar = false,
    attendanceStreak = 0,
  ): Promise<EconomyOverview> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      const current = await this.readLoadout(client, accountId);
      current[slot] = cosmeticId;
      const selectedIds = await this.validateOwnedTileLoadout(
        client,
        accountId,
        current,
        allowSimilar,
      );
      await this.writeTileLoadout(client, accountId, current, selectedIds);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  async equipTileLoadout(
    accountId: string,
    loadout: TileLoadout,
    allowSimilar = false,
    attendanceStreak = 0,
  ): Promise<EconomyOverview> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      const selectedIds = await this.validateOwnedTileLoadout(
        client,
        accountId,
        loadout,
        allowSimilar,
      );
      await this.writeTileLoadout(client, accountId, loadout, selectedIds);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  async saveTilePalette(
    accountId: string,
    slotIndex: number,
    name: string | null,
    loadout: TileLoadout,
    allowSimilar = false,
    attendanceStreak = 0,
  ): Promise<EconomyOverview> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      await this.validateOwnedTileLoadout(client, accountId, loadout, allowSimilar);
      await client.query(
        `insert into account_tile_palettes (
           account_id, slot_index, name,
           tile_color_a_id, tile_color_b_id, tile_color_c_id
         ) values ($1, $2, $3, $4, $5, $6)
         on conflict (account_id, slot_index) do update set
           name = excluded.name,
           tile_color_a_id = excluded.tile_color_a_id,
           tile_color_b_id = excluded.tile_color_b_id,
           tile_color_c_id = excluded.tile_color_c_id,
           updated_at = now()`,
        [
          accountId,
          slotIndex,
          name,
          loadout.colorA ?? null,
          loadout.colorB ?? null,
          loadout.colorC ?? null,
        ],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  async deleteTilePalette(
    accountId: string,
    slotIndex: number,
    attendanceStreak = 0,
  ): Promise<EconomyOverview> {
    await this.pool.query(
      `delete from account_tile_palettes where account_id = $1 and slot_index = $2`,
      [accountId, slotIndex],
    );
    return this.getOverview(accountId, attendanceStreak);
  }

  async resetTileColor(
    accountId: string,
    slot: TileLoadoutSlot,
    attendanceStreak = 0,
  ): Promise<EconomyOverview> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      const column: Record<TileLoadoutSlot, string> = {
        colorA: "tile_color_a_id",
        colorB: "tile_color_b_id",
        colorC: "tile_color_c_id",
      };
      await client.query(
        `update account_loadouts set ${column[slot]} = null, updated_at = now()
         where account_id = $1`,
        [accountId],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  async equipStyleCosmetic(
    accountId: string,
    slot: StyleLoadoutSlot,
    cosmeticId: string | null,
    attendanceStreak = 0,
  ): Promise<EconomyOverview> {
    const slots: Record<StyleLoadoutSlot, { column: string; equipSlot: CosmeticEquipSlot }> = {
      boardTheme: { column: "board_theme_id", equipSlot: "board_theme" },
      placementEffect: { column: "placement_effect_id", equipSlot: "placement_effect" },
      scoreEffect: { column: "score_effect_id", equipSlot: "score_effect" },
      victoryEffect: { column: "victory_effect_id", equipSlot: "victory_effect" },
    };
    const target = slots[slot];
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      if (cosmeticId !== null) {
        const owned = await client.query(
          `select 1 from cosmetic_catalog c
           join account_cosmetics ac on ac.cosmetic_id = c.id
           where ac.account_id = $1 and c.id = $2 and c.equip_slot = $3
             and c.active and c.availability in ('active', 'pack_only')`,
          [accountId, cosmeticId, target.equipSlot],
        );
        if ((owned.rowCount ?? 0) === 0) throw new Error("COSMETIC_NOT_OWNED");
      }
      await client.query(
        `update account_loadouts set ${target.column} = $2, updated_at = now() where account_id = $1`,
        [accountId, cosmeticId],
      );
      if (cosmeticId !== null) {
        await client.query(
          `update account_cosmetics set first_equipped_at = coalesce(first_equipped_at, now())
           where account_id = $1 and cosmetic_id = $2`,
          [accountId, cosmeticId],
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  async setWishlist(
    accountId: string,
    cosmeticId: string,
    wished: boolean,
    attendanceStreak = 0,
  ): Promise<EconomyOverview> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      await client.query("select 1 from accounts where id = $1 for update", [accountId]);
      if (wished) {
        const item = await client.query(
          `select 1 from cosmetic_catalog where id = $1 and active and availability = 'active'`,
          [cosmeticId],
        );
        if ((item.rowCount ?? 0) === 0) throw new Error("COSMETIC_NOT_FOUND");
        const count = await client.query<{ count: string }>(
          `select count(*)::text as count from account_cosmetic_wishlist
           where account_id = $1 and cosmetic_id <> $2`,
          [accountId, cosmeticId],
        );
        if (Number.parseInt(count.rows[0]?.count ?? "0", 10) >= 10) {
          throw new Error("WISHLIST_LIMIT_REACHED");
        }
        await client.query(
          `insert into account_cosmetic_wishlist (account_id, cosmetic_id)
           values ($1, $2) on conflict do nothing`,
          [accountId, cosmeticId],
        );
      } else {
        await client.query(
          `delete from account_cosmetic_wishlist where account_id = $1 and cosmetic_id = $2`,
          [accountId, cosmeticId],
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    return this.getOverview(accountId, attendanceStreak);
  }

  async hasEntitlement(accountId: string, entitlement: "founder" | "premium"): Promise<boolean> {
    const values = entitlement === "premium" ? ["premium", "founder"] : ["founder"];
    const result = await this.pool.query(
      `select 1 from account_entitlements
       where account_id = $1 and entitlement = any($2::text[]) and status = 'active' limit 1`,
      [accountId, values],
    );
    return (result.rowCount ?? 0) > 0;
  }

  private async rewardOnlineMatch(
    accountId: string,
    opponentKey: string,
    gameId: string,
    won: boolean,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureAccount(client, accountId);
      await this.lockWallet(client, accountId);
      const dayKey = seoulDayKey();
      const duplicate = await client.query(
        `select 1 from economy_match_rewards where account_id = $1 and game_id = $2`,
        [accountId, gameId],
      );
      const duplicateGame = (duplicate.rowCount ?? 0) > 0;
      if (duplicateGame) {
        await client.query("rollback");
        return;
      }
      const [daily, sameOpponent] = await Promise.all([
        client.query<{ count: string }>(
          `select count(*)::text as count from economy_match_rewards
           where account_id = $1 and day_key = $2`,
          [accountId, dayKey],
        ),
        client.query<{ count: string }>(
          `select count(*)::text as count from economy_match_rewards
           where account_id = $1 and day_key = $2 and opponent_key = $3`,
          [accountId, dayKey, opponentKey],
        ),
      ]);
      if (!canRewardOnlineMatch(
        Number.parseInt(daily.rows[0]?.count ?? "0", 10),
        Number.parseInt(sameOpponent.rows[0]?.count ?? "0", 10),
        duplicateGame,
      )) {
        await client.query("rollback");
        return;
      }
      await client.query(
        `insert into economy_match_rewards (
           account_id, game_id, day_key, opponent_key, won, reward_chips
         ) values ($1, $2, $3, $4, $5, 4)`,
        [accountId, gameId, dayKey, opponentKey, won],
      );
      await this.credit(client, accountId, 4, "online_match", `match:${gameId}:complete`, {
        gameId,
        dayKey,
        opponentKey,
      });
      if (won) {
        await client.query(
          `insert into economy_quest_unlocks (
             account_id, quest_key, cycle_key, reward_chips, progress, goal
           ) values ($1, 'first_online_win', $2, 8, 1, 1)
           on conflict (account_id, quest_key, cycle_key) do nothing`,
          [accountId, dayKey],
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async recordFinishedRoom(
    room: RoomSnapshot,
    rewardIdentities: RewardIdentities = {},
  ): Promise<void> {
    const game = room.game;
    if (game === null || !isRewardEligibleRoom(room)) return;
    const [first, second] = game.players;
    const firstOpponent = rewardIdentities[second.id]
      ?? (second.accountId ? `account:${second.accountId}` : `guest:${second.id}`);
    const secondOpponent = rewardIdentities[first.id]
      ?? (first.accountId ? `account:${first.accountId}` : `guest:${first.id}`);
    const rewards: Promise<void>[] = [];
    if (first.accountId) {
      rewards.push(this.rewardOnlineMatch(first.accountId, firstOpponent, game.id, game.winnerId === first.id));
    }
    if (second.accountId) {
      rewards.push(this.rewardOnlineMatch(second.accountId, secondOpponent, game.id, game.winnerId === second.id));
    }
    await Promise.all(rewards);
  }
}

export const createEconomyStoreFromEnv = (): EconomyStore => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.trim()) return new NullEconomyStore();
  return new PostgresEconomyStore(connectionString, process.env.DATABASE_SSL === "true");
};
