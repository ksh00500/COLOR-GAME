import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CraftCategory } from "../api";
import { CosmeticCategoryIcon } from "./CosmeticCategoryIcon";

describe("CosmeticCategoryIcon", () => {
  it.each([
    "tile_color",
    "board_theme",
    "placement_effect",
    "score_effect",
    "victory_effect",
  ] as CraftCategory[])("renders a self-contained %s vector icon", (category) => {
    const html = renderToStaticMarkup(<CosmeticCategoryIcon category={category} />);

    expect(html).toContain("<svg");
    expect(html).toContain("cosmetic-category-icon");
    expect(html).not.toContain("<img");
  });
});
