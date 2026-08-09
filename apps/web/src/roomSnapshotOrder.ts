import type { RoomSnapshot } from "@color-game/shared-types";

/**
 * Socket broadcasts and acknowledgement callbacks can arrive in either order.
 * Never let an older acknowledgement roll the UI back after a later move.
 */
export const isRoomSnapshotNewer = (
  current: RoomSnapshot | null,
  candidate: RoomSnapshot,
): boolean => {
  if (current === null || current.code !== candidate.code) return true;

  const currentGame = current.game;
  const candidateGame = candidate.game;
  if (
    currentGame !== null
    && candidateGame !== null
    && currentGame.id === candidateGame.id
  ) {
    if (candidateGame.turnNumber !== currentGame.turnNumber) {
      return candidateGame.turnNumber > currentGame.turnNumber;
    }
    return candidate.updatedAt > current.updatedAt;
  }

  return candidate.updatedAt > current.updatedAt;
};
