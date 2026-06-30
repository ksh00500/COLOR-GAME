import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TileSkinPreview } from "./TileSkinPreview";

describe("TileSkinPreview", () => {
  it("renders the clipped color surface separately from the outer outline", () => {
    const html = renderToStaticMarkup(
      <TileSkinPreview
        item={{
          visualKind: "split",
          colors: ["#c53e61", "#7d3e91"],
          pattern: null,
          splitAngle: 90,
        }}
        className="collection-tile-preview"
        label="베리"
      />,
    );

    expect(html).toContain("tile-skin-preview collection-tile-preview");
    expect(html).toContain('class="tile-skin-preview-fill"');
    expect(html).toContain("--tile-skin-background:linear-gradient(90deg");
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="베리"');
  });
});
