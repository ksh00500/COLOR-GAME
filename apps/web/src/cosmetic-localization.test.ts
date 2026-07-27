import { describe, expect, it } from "vitest";
import type { CosmeticItem } from "./api";
import { localizedCosmeticDescription } from "./cosmetic-localization";

const cosmetic = (category: CosmeticItem["category"], descriptionKo = "고유 효과 설명"): CosmeticItem => ({
  id: `test-${category}`,
  category,
  equipSlot: category === "board_theme" || category === "placement_effect" || category === "score_effect"
    ? category
    : "tile_color",
  rarity: "common",
  nameKo: "테스트",
  nameEn: "Test",
  localizedNames: { ko: "테스트", en: "Test" },
  descriptionKo,
  chipPrice: 0,
  visualKind: category === "board_theme" ? "board" : category === "placement_effect" ? "placement" : "score",
  colors: ["#aa4455"],
  pattern: null,
  splitAngle: null,
  representativeColor: "#aa4455",
  availability: "active",
  owned: true,
  isNew: false,
  equippedSlots: [],
});

describe("localizedCosmeticDescription", () => {
  it("keeps each cosmetic's specific Korean effect description", () => {
    expect(localizedCosmeticDescription(cosmetic("placement_effect"), "ko")).toBe("고유 효과 설명");
  });

  it("explains effect timing in every supported non-Korean locale", () => {
    const item = cosmetic("score_effect");

    for (const locale of ["en", "ja", "es", "pt-BR"]) {
      expect(localizedCosmeticDescription(item, locale)).not.toBe("");
      expect(localizedCosmeticDescription(item, locale)).not.toBe(item.descriptionKo);
    }
  });
});
