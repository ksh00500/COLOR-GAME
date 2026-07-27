import { describe, expect, it } from "vitest";
import { getMoveEffectTimeline } from "./effectTimeline";

describe("getMoveEffectTimeline", () => {
  it("separates placement and scoring into two visible phases", () => {
    const standard = getMoveEffectTimeline("standard", false);
    const fast = getMoveEffectTimeline("fast", false);

    expect(standard.scorePhaseDelayMs).toBeGreaterThanOrEqual(350);
    expect(standard.boardCommitDelayMs).toBeGreaterThanOrEqual(
      standard.scorePhaseDelayMs + 650 + 160,
    );
    expect(fast.scorePhaseDelayMs).toBeGreaterThan(0);
    expect(fast.boardCommitDelayMs).toBeGreaterThan(fast.scorePhaseDelayMs);
  });

  it("keeps full-board cleanup immediate and compact", () => {
    expect(getMoveEffectTimeline("standard", true)).toEqual({
      scorePhaseDelayMs: 0,
      boardCommitDelayMs: 560,
      scoreNoticeDurationMs: 0,
    });
  });
});
