import { describe, expect, it } from "vitest";
import { getPaletteSpriteFrame } from "./RankBadge";

describe("palette tier icon", () => {
  it("maps blank through violet to the first eight sprite cells", () => {
    expect(
      Array.from({ length: 8 }, (_, filledCount) =>
        getPaletteSpriteFrame(filledCount),
      ),
    ).toEqual([
      { index: 0, column: 0, row: 0 },
      { index: 1, column: 1, row: 0 },
      { index: 2, column: 2, row: 0 },
      { index: 3, column: 0, row: 1 },
      { index: 4, column: 1, row: 1 },
      { index: 5, column: 2, row: 1 },
      { index: 6, column: 0, row: 2 },
      { index: 7, column: 1, row: 2 },
    ]);
  });

  it("uses the final sprite cell for rainbow", () => {
    expect(getPaletteSpriteFrame(7, true)).toEqual({
      index: 8,
      column: 2,
      row: 2,
    });
  });

  it("clamps invalid filled counts to available tier images", () => {
    expect(getPaletteSpriteFrame(-3).index).toBe(0);
    expect(getPaletteSpriteFrame(99).index).toBe(7);
  });
});
