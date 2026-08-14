import { describe, expect, it } from "vitest";
import type { CosmeticItem, EconomyOverview } from "./api";
import { cosmeticBackground, matchCosmeticsFromEconomy } from "./cosmetics";

const item = (input: Partial<CosmeticItem>): CosmeticItem => ({
  id: "test",
  category: "tile_color",
  equipSlot: "tile_color",
  rarity: "common",
  nameKo: "테스트",
  nameEn: "Test",
  localizedNames: {},
  descriptionKo: "테스트",
  chipPrice: 150,
  visualKind: "solid",
  colors: ["#112233"],
  pattern: null,
  splitAngle: null,
  representativeColor: "#112233",
  availability: "active",
  owned: false,
  isNew: false,
  equippedSlots: [],
  ...input,
});

describe("cosmetic backgrounds", () => {
  it("renders a common skin as one solid color", () => {
    expect(cosmeticBackground(item({}))).toBe("#112233");
  });

  it("renders a rare skin as an exact fixed half split", () => {
    expect(cosmeticBackground(item({
      visualKind: "split",
      colors: ["#7d3e91", "#31a56f"],
      splitAngle: 90,
    }))).toBe("linear-gradient(90deg, #7d3e91 0 50%, #31a56f 50% 100%)");
  });

  it("renders epic and legendary skins with their shared game background", () => {
    expect(cosmeticBackground(item({
      visualKind: "gradient",
      colors: ["#111111", "#777777", "#ffffff"],
    }))).toContain("#777777 50%");
    expect(cosmeticBackground(item({
      visualKind: "pattern",
      pattern: "kintsugi",
      colors: ["#202124", "#d7ad45", "#6e5524"],
    }))).toContain("#d7ad45");
  });

  it("renders distinct refined patterns for every legendary skin", () => {
    const stainedGlass = cosmeticBackground(item({
      visualKind: "pattern",
      pattern: "stained-glass",
      colors: ["#e85a6b", "#e8c84f", "#45a7c6"],
    }));
    const spectrum = cosmeticBackground(item({
      visualKind: "pattern",
      pattern: "tango-spectrum",
      colors: ["#d84d63", "#36a173", "#4d6ed7"],
    }));
    expect(stainedGlass).toContain("conic-gradient");
    expect(stainedGlass).not.toContain("rgba(25,22,29");
    expect(spectrum).toContain("radial-gradient");
    expect(spectrum).not.toContain("repeating-linear-gradient");
  });
});

describe("match cosmetics", () => {
  const economy = (inventory: CosmeticItem[], styleLoadout: EconomyOverview["styleLoadout"]): EconomyOverview => ({
    wallet: { colorChips: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
    boxTickets: 0,
    fragments: { common: 0, rare: 0, epic: 0, legendary: 0 },
    weeklyStore: { weekKey: "2026-08-10", endsAt: "2026-08-17", items: [] },
    attendance: {
      dayKey: "2026-08-15",
      weekKey: "2026-08-09",
      weekStartsAt: "2026-08-09",
      weekEndsAt: "2026-08-16",
      attendedToday: false,
      weeklyCount: 0,
      weeklyGoal: 5,
    },
    catalog: inventory,
    inventory,
    loadout: {},
    styleLoadout,
    wishlist: [],
    tilePalettes: [],
    upcomingCategories: [],
    quests: [],
    ledger: [],
    entitlements: [],
    monetization: {
      rewardAds: { status: "upcoming", rewardChips: 12, dailyLimit: 3, usedToday: 0 },
      founderPack: {
        status: "upcoming",
        referencePriceKrw: 9_900,
        bonusChips: 500,
        startsAt: null,
        endsAt: null,
      },
      premiumPack: { status: "upcoming", referencePriceKrw: 6_900 },
    },
    box: {
      priceChips: 120,
      fragmentRequirement: 4,
      probabilityVersion: "test",
      outcomes: [],
    },
  });

  it("passes the equipped Forest Scatter definition to an AI match", () => {
    const forestScatter = item({
      id: "score-forest-scatter",
      category: "score_effect",
      equipSlot: "score_effect",
      visualKind: "score",
      preset: "scatter",
      colors: ["#5f8d73", "#d9c99a"],
      durationMs: 640,
      owned: true,
    });

    expect(matchCosmeticsFromEconomy(
      economy([forestScatter], { scoreEffect: forestScatter.id }),
    )).toEqual({
      scoreEffect: {
        id: "score-forest-scatter",
        preset: "scatter",
        colors: ["#5f8d73", "#d9c99a"],
        durationMs: 640,
      },
    });
  });

  it("does not activate a missing or unowned loadout item", () => {
    expect(matchCosmeticsFromEconomy(
      economy([], { scoreEffect: "score-forest-scatter" }),
    )).toBeNull();
  });
});
