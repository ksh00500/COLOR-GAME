import { describe, expect, it } from "vitest";
import { paintSpots, paletteHole } from "./RankBadge";

describe("palette tier icon", () => {
  it("follows the outer palette curve from red to violet", () => {
    expect(paintSpots.map(({ cx, cy }) => [cx, cy])).toEqual([
      [54, 21],
      [71, 24],
      [86, 31],
      [92, 43],
      [86, 55],
      [70, 62],
      [52, 60],
    ]);
  });

  it("keeps every paint spot away from the finger hole", () => {
    for (const spot of paintSpots) {
      const centerDistance = Math.hypot(
        spot.cx - paletteHole.cx,
        spot.cy - paletteHole.cy,
      );
      expect(centerDistance).toBeGreaterThan(
        paletteHole.radius + Math.max(spot.rx, spot.ry) + 2,
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
          Math.max(spot.rx, spot.ry) + Math.max(other.rx, other.ry),
        );
      }
    }
  });
});
