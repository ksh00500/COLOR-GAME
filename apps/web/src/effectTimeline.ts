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
 * (350 ms placement + 650 ms scoring) without clipping either effect.
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
    ? { scorePhaseDelayMs: 250, boardCommitDelayMs: 760, scoreNoticeDurationMs: 1_150 }
    : { scorePhaseDelayMs: 400, boardCommitDelayMs: 1_250, scoreNoticeDurationMs: 1_700 };
};
