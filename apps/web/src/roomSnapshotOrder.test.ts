import { describe, expect, it } from "vitest";
import type { RoomSnapshot } from "@color-game/shared-types";
import { createInitialGame, DEFAULT_GAME_CONFIG } from "@color-game/game-core";
import { isRoomSnapshotNewer } from "./roomSnapshotOrder";

const snapshot = (turnNumber: number, updatedAt: number): RoomSnapshot => ({
  code: "ABC123",
  mode: "casual",
  status: "playing",
  hostPlayerId: "player1",
  players: [
    {
      id: "player1", nickname: "A", avatarId: "orbit", isGuest: false, connected: true, ready: true,
    },
    {
      id: "player2", nickname: "B", avatarId: "orbit", isGuest: false, connected: true, ready: true,
    },
  ],
  game: {
    ...createInitialGame({
      ...DEFAULT_GAME_CONFIG,
      colors: [...DEFAULT_GAME_CONFIG.colors],
      scoreRules: { ...DEFAULT_GAME_CONFIG.scoreRules },
      turnTimeLimitSeconds: null,
    }, { now: 1_000 }),
    turnNumber,
  },
  createdAt: 1_000,
  updatedAt,
});

describe("room snapshot ordering", () => {
  it("accepts a later turn even when timestamps share a millisecond", () => {
    expect(isRoomSnapshotNewer(snapshot(2, 2_000), snapshot(3, 2_000))).toBe(true);
  });

  it("rejects delayed acknowledgements from an older turn", () => {
    expect(isRoomSnapshotNewer(snapshot(3, 3_000), snapshot(2, 4_000))).toBe(false);
  });

  it("rejects duplicate snapshots and accepts same-turn room updates", () => {
    expect(isRoomSnapshotNewer(snapshot(3, 3_000), snapshot(3, 3_000))).toBe(false);
    expect(isRoomSnapshotNewer(snapshot(3, 3_000), snapshot(3, 3_001))).toBe(true);
  });
});
