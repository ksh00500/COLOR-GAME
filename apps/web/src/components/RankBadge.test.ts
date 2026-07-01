import { describe, expect, it } from "vitest";
import { paintSpots, paletteHole } from "./RankBadge";

describe("palette tier icon", () => {
  it("follows the outer palette curve from red to violet", () => {
    expect(paintSpots.map(({ cx, cy }) => [cx, cy])).toEqual([
      [42, 22],
      [55, 18],
      [68, 19],
      [80, 23],
      [89, 30],
      [94, 40],
      [91, 51],
    ]);
  });

  it("keeps every paint spot away from the finger hole", () => {
    for (const spot of paintSpots) {
      const centerDistance = Math.hypot(
        spot.cx - paletteHole.cx,
        spot.cy - paletteHole.cy,
      );
      expect(centerDistance).toBeGreaterThan(
        paletteHole.radius + spot.r + 2,
      );
    }
  });

  it("lays out all seven colors without overlapping each other", () => {
    for (const [index, spot] of paintSpots.entries()) {
      for (const other of paintSpots.slice(index + 1)) {
        const centerDistance = Math.hypot(
          spot.cx - other.cx,
          spot.cy - other.cy,
        );
        expect(centerDistance).toBeGreaterThan(
          spot.r + other.r,
        );
      }
    }
  });
});
