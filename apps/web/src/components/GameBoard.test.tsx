import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Board, MatchCosmetics } from "@color-game/shared-types";
import { GameBoard } from "./GameBoard";

vi.mock("../i18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      Object.entries(values ?? {}).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        key,
      ),
  }),
}));

const board: Board = [
  ["colorA", "colorA", "colorA", null, null],
  [null, null, null, null, null],
  [null, null, null, null, null],
  [null, null, null, null, null],
  [null, null, null, null, null],
];

describe("GameBoard score callout", () => {
  it("shows earned points instead of the number of removed cells", () => {
    const html = renderToStaticMarkup(
      <GameBoard
        board={board}
        selectedColor="colorA"
        canPlay={false}
        showShapes={false}
        focusedIndex={0}
        scoringCells={new Set(["0:0", "0:1", "0:2"])}
        scoreValue={1}
        lastPlaced={{ row: 0, col: 2 }}
        invalidCell={null}
        onFocusedIndexChange={() => undefined}
        onPlace={() => undefined}
      />,
    );

    expect(html).toContain("score-effect-callout");
    expect(html).not.toContain("tango-board-fx");
    expect(html).toContain(">+1<");
    expect(html).not.toContain(">+3<");
  });

  it("mounts the refined renderer for an equipped placement effect", () => {
    const cosmetics: MatchCosmetics = {
      placementEffect: {
        id: "place-cosmos-orbit",
        preset: "orbit",
        colors: ["#8b7de4", "#56d2ca"],
        durationMs: 350,
      },
    };

    const html = renderToStaticMarkup(
      <GameBoard
        board={board}
        selectedColor="colorA"
        canPlay={false}
        showShapes={false}
        focusedIndex={0}
        scoringCells={new Set()}
        lastPlaced={{ row: 0, col: 2 }}
        invalidCell={null}
        activeCosmetics={cosmetics}
        onFocusedIndexChange={() => undefined}
        onPlace={() => undefined}
      />,
    );

    expect(html).toContain("tango-board-fx");
    expect(html).toContain('data-placement-design="cosmos-orbit"');
    expect(html).toContain('data-placement-preset="orbit"');
    expect(html).toContain('data-placement-fx-engine="modern"');
  });
});
