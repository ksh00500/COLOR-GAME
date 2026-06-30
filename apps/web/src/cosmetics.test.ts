import { describe, expect, it } from "vitest";
import type { CosmeticItem } from "./api";
import { cosmeticBackground } from "./cosmetics";

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
    expect(stainedGlass).toContain("49.5%");
    expect(spectrum).toContain("repeating-linear-gradient");
  });
});
