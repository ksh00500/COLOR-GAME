import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CosmeticItem } from "../api";
import { CosmeticPreview } from "./CosmeticPreview";

type PreviewCategory = "board_theme" | "placement_effect" | "score_effect" | "victory_effect";

const cosmetic = (category: PreviewCategory): CosmeticItem => ({
  id: `preview-${category}`,
  category,
  equipSlot: category,
  rarity: "common",
  nameKo: "미리보기",
  nameEn: "Preview",
  localizedNames: { ko: "미리보기", en: "Preview" },
  descriptionKo: "",
  chipPrice: 0,
  visualKind: category === "board_theme" ? "board" : category === "placement_effect" ? "placement" : category === "score_effect" ? "score" : "victory",
  colors: ["#b34f68", "#3d587f", "#d5aa61"],
  pattern: null,
  splitAngle: null,
  preset: "default",
  representativeColor: "#b34f68",
  availability: "active",
  owned: false,
  isNew: false,
  equippedSlots: [],
});

describe("CosmeticPreview", () => {
  it.each(["board_theme", "placement_effect", "score_effect", "victory_effect"] as const)(
    "isolates the %s preview from the legacy tile preview styles",
    (category) => {
      const html = renderToStaticMarkup(<CosmeticPreview item={cosmetic(category)} label="preview" />);

      expect(html).toContain(`atelier-cosmetic-preview-${category}`);
      expect(html).toContain("rarity-common");
      expect(html).not.toMatch(/class="cosmetic-preview(?:\s|")/);
      expect(html).toContain('aria-label="preview"');
    },
  );

  it("renders a complete 5 by 5 board preview with three sample tiles", () => {
    const html = renderToStaticMarkup(<CosmeticPreview item={cosmetic("board_theme")} label="board" />);

    expect((html.match(/<i/g) ?? [])).toHaveLength(25);
    expect(html).toContain("atelier-cosmetic-preview-board-shell");
    expect(html).toContain("preview-board-inlay");
    expect(html).toContain("sample-a");
    expect(html).toContain("sample-b");
    expect(html).toContain("sample-c");
  });

  it("uses descriptive vector scenes instead of letter placeholders", () => {
    const score = renderToStaticMarkup(<CosmeticPreview item={cosmetic("score_effect")} label="score" />);
    const victory = renderToStaticMarkup(<CosmeticPreview item={cosmetic("victory_effect")} label="victory" />);

    expect(score).toContain("atelier-cosmetic-preview-score-row");
    expect(score).toContain("+4");
    expect(victory).toContain("victory-cup");
    expect(victory).toContain("victory-laurel");
    expect(victory).toContain("WIN");
  });
});
