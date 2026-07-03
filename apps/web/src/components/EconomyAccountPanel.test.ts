import { describe, expect, it } from "vitest";
import type { CosmeticItem, CosmeticRarity } from "../api";
import { filterOwnedTileItems } from "./EconomyAccountPanel";

const tile = (
  id: string,
  rarity: CosmeticRarity,
  nameKo: string,
  nameEn: string,
): CosmeticItem => ({
  id,
  category: "tile_color",
  equipSlot: "tile_color",
  rarity,
  nameKo,
  nameEn,
  localizedNames: { ko: nameKo, en: nameEn },
  descriptionKo: "",
  chipPrice: 0,
  visualKind: "solid",
  colors: ["#000000"],
  pattern: null,
  splitAngle: null,
  representativeColor: "#000000",
  availability: "active",
  owned: true,
  isNew: false,
  equippedSlots: [],
});

const ownedTiles = [
  tile("indigo", "common", "인디고", "Indigo"),
  tile("aurora", "epic", "오로라", "Aurora"),
  tile("cosmos", "legendary", "코스모스", "Cosmos"),
];

describe("owned tile filters", () => {
  it("filters by rarity", () => {
    expect(filterOwnedTileItems(ownedTiles, "ko", "", "epic").map((item) => item.id))
      .toEqual(["aurora"]);
  });

  it("searches localized, Korean, and English names", () => {
    expect(filterOwnedTileItems(ownedTiles, "ko", "인디", "all").map((item) => item.id))
      .toEqual(["indigo"]);
    expect(filterOwnedTileItems(ownedTiles, "ko", "cosmos", "all").map((item) => item.id))
      .toEqual(["cosmos"]);
  });

  it("combines the name and rarity filters", () => {
    expect(filterOwnedTileItems(ownedTiles, "en", "aur", "epic").map((item) => item.id))
      .toEqual(["aurora"]);
    expect(filterOwnedTileItems(ownedTiles, "en", "aur", "common"))
      .toEqual([]);
  });
});
