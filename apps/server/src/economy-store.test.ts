import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { RoomSnapshot } from "@color-game/shared-types";
import {
  boxOutcomeForRoll,
  boxOutcomes,
  boxPrice,
  canRewardOnlineMatch,
  hexToOklab,
  isRewardEligibleRoom,
  oklabDistance,
  selectWeeklyCatalog,
  selectWeeklyCatalogByCategory,
  seoulDayKey,
  seoulQuestWeek,
  seoulWeek,
  TileColorSimilarityError,
  validateTileColorCombination,
  weeklyQuestGoals,
} from "./economy-store.js";
import { createGuestToken, verifyGuestToken } from "./server.js";

const roomAtTurn = (turnNumber: number, mode: RoomSnapshot["mode"] = "casual"): RoomSnapshot => ({
  code: "ROOM01",
  mode,
  status: "finished",
  hostPlayerId: "p1",
  spectatorsAllowed: true,
  players: [
    { id: "p1", accountId: "a1", nickname: "A", avatarId: "orbit", isGuest: false, ready: true, connected: true },
    { id: "p2", nickname: "B", avatarId: "prism", isGuest: true, ready: true, connected: true },
  ],
  game: {
    id: "game-1",
    mode,
    status: "finished",
    board: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null)),
    players: [
      { id: "p1", accountId: "a1", nickname: "A", avatarId: "orbit", score: 7, connectionStatus: "connected", isGuest: false },
      { id: "p2", nickname: "B", avatarId: "prism", score: 3, connectionStatus: "connected", isGuest: true },
    ],
    currentPlayerId: null,
    turnNumber,
    winnerId: "p1",
    result: "target-score",
    lastMove: null,
    turnTimer: null,
    config: {
      boardSize: 5,
      targetScore: 7,
      colors: ["colorA", "colorB", "colorC"],
      scoreRules: { 3: 1, 4: 2, 5: 4 },
      turnTimeLimitSeconds: 60,
    },
  },
  createdAt: 1,
  updatedAt: 2,
});

describe("economy policy", () => {
  it("uses the revised weekly attendance, match, and win goals", () => {
    expect(weeklyQuestGoals).toEqual({
      attendance: 5,
      matches: 20,
      wins: 10,
    });
  });

  it("removes the seven-day attendance reward from the economy implementation", () => {
    const storeSource = readFileSync(
      fileURLToPath(new URL("./economy-store.ts", import.meta.url)),
      "utf8",
    );
    expect(storeSource).not.toContain('key: "attendance_streak"');
    expect(storeSource).not.toContain("'attendance_streak', $2, 20, 7, 7");
  });

  it("uses the v1.2.1 palette box price", () => {
    expect(boxPrice).toBe(100);
  });

  it("uses Korean midnight for daily keys", () => {
    expect(seoulDayKey(new Date("2026-06-28T14:59:59.999Z"))).toBe("2026-06-28");
    expect(seoulDayKey(new Date("2026-06-28T15:00:00.000Z"))).toBe("2026-06-29");
  });

  it("rotates the global store on Monday midnight KST", () => {
    const before = seoulWeek(new Date("2026-06-28T14:59:59.999Z"));
    const after = seoulWeek(new Date("2026-06-28T15:00:00.000Z"));
    expect(before.weekKey).toBe("2026-06-22");
    expect(after.weekKey).toBe("2026-06-29");
    expect(after.startsAt.toISOString()).toBe("2026-06-28T15:00:00.000Z");
  });

  it("resets weekly quests after Sunday ends at Monday midnight KST", () => {
    const before = seoulQuestWeek(new Date("2026-07-05T14:59:59.999Z"));
    const after = seoulQuestWeek(new Date("2026-07-05T15:00:00.000Z"));
    expect(before.weekKey).toBe("2026-06-29");
    expect(after.weekKey).toBe("2026-07-06");
    expect(after.startsAt.toISOString()).toBe("2026-07-05T15:00:00.000Z");
    expect(after.endsAt.toISOString()).toBe("2026-07-12T15:00:00.000Z");
  });

  it("keeps the disclosed box odds at exactly 100 percent", () => {
    expect(boxOutcomes.reduce((total, outcome) => total + outcome.probability, 0)).toBe(100);
    expect(boxOutcomeForRoll(0)).toEqual({ type: "fragment", rarity: "common" });
    expect(boxOutcomeForRoll(3599)).toEqual({ type: "fragment", rarity: "common" });
    expect(boxOutcomeForRoll(3600)).toEqual({ type: "fragment", rarity: "rare" });
    expect(boxOutcomeForRoll(9999)).toEqual({ type: "cosmetic", rarity: "legendary" });
    expect(() => boxOutcomeForRoll(10_000)).toThrow("INVALID_BOX_ROLL");
  });

  it("selects the same global 5/4/3/1 weekly assortment", () => {
    const catalog = ([
      ["common", 14],
      ["rare", 10],
      ["epic", 8],
      ["legendary", 4],
    ] as const).flatMap(([rarity, count]) =>
      Array.from({ length: count }, (_, index) => ({ id: `${rarity}-${index}`, rarity })),
    );
    const first = selectWeeklyCatalog(catalog, "2026-06-29");
    const second = selectWeeklyCatalog([...catalog].reverse(), "2026-06-29");
    expect(first).toEqual(second);
    expect(first).toHaveLength(13);
    expect(first.filter((id) => id.startsWith("common-"))).toHaveLength(5);
    expect(first.filter((id) => id.startsWith("rare-"))).toHaveLength(4);
    expect(first.filter((id) => id.startsWith("epic-"))).toHaveLength(3);
    expect(first.filter((id) => id.startsWith("legendary-"))).toHaveLength(1);
  });

  it("keeps 36 public tile skins available to the collection", () => {
    const migrationPath = fileURLToPath(new URL("../db/migrations/007_economy_store.sql", import.meta.url));
    const migration = readFileSync(migrationPath, "utf8");
    const publicTileRows = migration.match(
      /^\s*\('tile-[^']+', 'tile_color', 'tile_color'.*'active', true, true\),?$/gm,
    ) ?? [];
    expect(publicTileRows).toHaveLength(36);
  });

  it("enforces daily, opponent, and duplicate match limits", () => {
    expect(canRewardOnlineMatch(0, 0, false)).toBe(true);
    expect(canRewardOnlineMatch(4, 1, false)).toBe(true);
    expect(canRewardOnlineMatch(5, 0, false)).toBe(false);
    expect(canRewardOnlineMatch(0, 2, false)).toBe(false);
    expect(canRewardOnlineMatch(0, 0, true)).toBe(false);
  });

  it("requires six completed placements for online rewards", () => {
    expect(isRewardEligibleRoom(roomAtTurn(6))).toBe(false);
    expect(isRewardEligibleRoom(roomAtTurn(7))).toBe(true);
    expect(isRewardEligibleRoom(roomAtTurn(20, "private"))).toBe(false);
    expect(isRewardEligibleRoom(roomAtTurn(20, "ai"))).toBe(false);
  });

  it("rejects duplicate and overly similar tile colors", () => {
    expect(() => validateTileColorCombination([
      { id: "one", representativeColor: "#d93f5c" },
      { id: "one", representativeColor: "#31a56f" },
    ])).toThrow("DUPLICATE_TILE_COLOR");
    expect(() => validateTileColorCombination([
      { id: "one", representativeColor: "#d93f5c" },
      { id: "two", representativeColor: "#da405d" },
    ])).toThrow(TileColorSimilarityError);
    expect(() => validateTileColorCombination([
      { id: "one", representativeColor: "#d93f5c" },
      { id: "two", representativeColor: "#da405d" },
    ], true)).not.toThrow();
    expect(() => validateTileColorCombination([
      { id: "one", representativeColor: "#d93f5c" },
      { id: "one", representativeColor: "#da405d" },
    ], true)).toThrow("DUPLICATE_TILE_COLOR");
    expect(() => validateTileColorCombination([
      { id: "one", representativeColor: "#d93f5c" },
      { id: "two", representativeColor: "#31a56f" },
      { id: "three", representativeColor: "#4268d5" },
    ])).not.toThrow();
    expect(hexToOklab("#ffffff")).toHaveLength(3);
    expect(oklabDistance("#000000", "#ffffff")).toBeGreaterThan(0.9);
  });

  it("adds five deterministic weekly items for every new cosmetic category", () => {
    const categories = ["tile_color", "board_theme", "placement_effect", "score_effect", "victory_effect"] as const;
    const catalog = categories.flatMap((category) => ([
      ["common", 14], ["rare", 10], ["epic", 8], ["legendary", 4],
    ] as const).flatMap(([rarity, count]) =>
      Array.from({ length: count }, (_, index) => ({ id: `${category}-${rarity}-${index}`, category, rarity })),
    ));
    const selected = selectWeeklyCatalogByCategory(catalog, "2026-07-20");
    expect(selected.filter((id) => id.startsWith("tile_color-"))).toHaveLength(13);
    for (const category of categories.slice(1)) {
      expect(selected.filter((id) => id.startsWith(`${category}-`))).toHaveLength(5);
    }
    expect(selected).toEqual(selectWeeklyCatalogByCategory([...catalog].reverse(), "2026-07-20"));

    const following = selectWeeklyCatalogByCategory(catalog, "2026-07-27");
    for (const category of categories.slice(1)) {
      const firstHasLegendary = selected.some((id) => id.startsWith(`${category}-legendary-`));
      const nextHasLegendary = following.some((id) => id.startsWith(`${category}-legendary-`));
      expect(firstHasLegendary).not.toBe(nextHasLegendary);
    }
  });

  it("adds 48 atelier cosmetics and cascading wishlist/craft records", () => {
    const migration = readFileSync(
      fileURLToPath(new URL("../db/migrations/015_cosmetic_atelier.sql", import.meta.url)),
      "utf8",
    );
    const ids = migration.match(/^\s*\('(board|place|score|victory)-[^']+'/gm) ?? [];
    expect(ids).toHaveLength(48);
    for (const prefix of ["board", "place", "score", "victory"]) {
      expect(ids.filter((id) => id.includes(`('${prefix}-`))).toHaveLength(12);
    }
    expect(migration).toContain("case rarity when 'common' then 150 when 'rare' then 400 when 'epic' then 800 else 1600 end");
    expect(migration).toContain("'placement',array['#8b7de4','#56d2ca'],'orbit',350");
    expect(migration).toContain("'score',array['#8b7de4','#56d2ca'],'cosmos-fold',650");
    expect(migration).toContain("'victory',array['#8b7de4','#56d2ca'],'tableau',2500");
    expect(migration).toContain("create table if not exists account_cosmetic_wishlist");
    expect(migration).toContain("create table if not exists cosmetic_craft_history");
    expect(migration.match(/references accounts\(id\) on delete cascade/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("compares the final A, B, and C colors instead of the replaced slot default", () => {
    try {
      validateTileColorCombination([
        { id: "lemon", representativeColor: "#f4e04d", slot: "colorA" },
        { id: "yellow", representativeColor: "#f1d93a", slot: "colorB" },
        { id: "green", representativeColor: "#31a56f", slot: "colorC" },
      ]);
      throw new Error("EXPECTED_SIMILARITY_WARNING");
    } catch (error) {
      expect(error).toBeInstanceOf(TileColorSimilarityError);
      expect((error as TileColorSimilarityError).conflicts).toEqual([
        expect.objectContaining({ slots: ["colorA", "colorB"] }),
      ]);
    }
  });

  it("signs persistent guest identities and rejects tampering", () => {
    const secret = "test-secret";
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const token = createGuestToken(id, secret);
    expect(verifyGuestToken(token, secret)).toBe(id);
    expect(verifyGuestToken(`${id}.tampered`, secret)).toBeNull();
  });

  it("keeps every account-owned economy table on delete cascade", () => {
    const migrationPath = fileURLToPath(new URL("../db/migrations/007_economy_store.sql", import.meta.url));
    const migration = readFileSync(migrationPath, "utf8");
    const accountTables = [
      "economy_wallets",
      "economy_wallet_ledger",
      "economy_fragments",
      "account_cosmetics",
      "account_loadouts",
      "economy_quest_unlocks",
      "economy_match_rewards",
      "cosmetic_box_openings",
      "account_entitlements",
      "ad_reward_sessions",
    ];
    for (const table of accountTables) {
      const definition = migration.match(new RegExp(`create table if not exists ${table} \\(([\\s\\S]*?)\\n\\);`));
      expect(definition?.[1], table).toContain("references accounts(id) on delete cascade");
    }
  });

  it("persists the first cosmetic equip used by the new badge", () => {
    const migrationPath = fileURLToPath(
      new URL("../db/migrations/010_cosmetic_seen_and_static_patterns.sql", import.meta.url),
    );
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("first_equipped_at timestamptz");
    expect(migration).toContain("tile-tango-spectrum");
    expect(migration).toContain("정적으로 겹쳐진");
  });

  it("migrates v1.2.1 quest tickets, match outcomes, and catalog prices", () => {
    const migrationPath = fileURLToPath(
      new URL("../db/migrations/012_v121_profiles_quests_matches.sql", import.meta.url),
    );
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("reward_box_tickets");
    expect(migration).toContain("winner_player_slot");
    expect(migration).toContain("display_name_changed_at");
    expect(migration).toContain("when 'common' then 300");
    expect(migration).toContain("when 'rare' then 600");
    expect(migration).toContain("when 'epic' then 1500");
    expect(migration).toContain("when 'legendary' then 5000");
  });

  it("stores three account palette presets and preserves the current loadout", () => {
    const migrationPath = fileURLToPath(
      new URL("../db/migrations/014_tile_palette_presets.sql", import.meta.url),
    );
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("create table if not exists account_tile_palettes");
    expect(migration).toContain("references accounts(id) on delete cascade");
    expect(migration).toContain("check (slot_index between 1 and 3)");
    expect(migration).toContain("from account_loadouts");
    expect(migration).toContain("on conflict (account_id, slot_index) do nothing");
  });
});
