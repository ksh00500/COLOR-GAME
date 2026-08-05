import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Board } from "@color-game/shared-types";
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
    expect(html).toContain('data-fx-engine="modern"');
    expect(html).toContain("tango-board-fx");
    expect(html).toContain(">+1<");
    expect(html).not.toContain(">+3<");
  });
});
