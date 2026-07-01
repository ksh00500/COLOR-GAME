import { describe, expect, it } from "vitest";
import { paintSpots, paletteHole } from "./RankBadge";

describe("palette tier icon", () => {
  it("keeps the violet paint away from the finger hole", () => {
    const violet = paintSpots[paintSpots.length - 1]!;
    const centerDistance = Math.hypot(
      violet.cx - paletteHole.cx,
      violet.cy - paletteHole.cy,
    );

    expect(centerDistance).toBeGreaterThan(
      paletteHole.radius + Math.max(violet.rx, violet.ry) + 8,
    );
  });
});
