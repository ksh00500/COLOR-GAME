import type { PresentationSpeed } from "./settings";

export interface MoveEffectTimeline {
  scorePhaseDelayMs: number;
  boardCommitDelayMs: number;
  scoreNoticeDurationMs: number;
}

/**
 * A scoring move is deliberately split into two readable beats:
 * the placed tile lands first, then the connected tiles resolve.
 *
 * The standard budget covers the longest catalog combination
 * (up to 400 ms landing overlap + 860 ms scoring) without clipping either effect.
 */
export const getMoveEffectTimeline = (
  presentationSpeed: PresentationSpeed,
  isFullBoardClear: boolean,
): MoveEffectTimeline => {
  if (isFullBoardClear) {
    return presentationSpeed === "fast"
      ? { scorePhaseDelayMs: 0, boardCommitDelayMs: 340, scoreNoticeDurationMs: 0 }
      : { scorePhaseDelayMs: 0, boardCommitDelayMs: 560, scoreNoticeDurationMs: 0 };
  }

  return presentationSpeed === "fast"
    ? { scorePhaseDelayMs: 250, boardCommitDelayMs: 1_200, scoreNoticeDurationMs: 1_350 }
    : { scorePhaseDelayMs: 400, boardCommitDelayMs: 1_500, scoreNoticeDurationMs: 1_900 };
};
