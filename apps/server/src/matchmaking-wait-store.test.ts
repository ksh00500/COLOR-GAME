import { describe, expect, it } from "vitest";
import { getMatchmakingSegment } from "@color-game/shared-types";
import { median } from "./matchmaking-wait-store.js";

describe("matchmaking wait estimation", () => {
  it("uses the existing palette thresholds and a separate guest segment", () => {
    expect(getMatchmakingSegment(null)).toBe("guest");
    expect(getMatchmakingSegment(1000)).toBe("blank");
    expect(getMatchmakingSegment(1050)).toBe("red");
    expect(getMatchmakingSegment(1500)).toBe("navy");
    expect(getMatchmakingSegment(1600)).toBe("violet");
  });

  it("uses a median so unusually long waits do not dominate the estimate", () => {
    expect(median([4_000, 5_000, 6_000, 120_000])).toBe(5_500);
    expect(median([7_000, 5_000, 6_000])).toBe(6_000);
    expect(median([])).toBeNull();
  });
});
