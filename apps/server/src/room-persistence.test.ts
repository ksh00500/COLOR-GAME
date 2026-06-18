import { describe, expect, it } from "vitest";
import type { RoomSnapshot } from "@color-game/shared-types";
import type { GameHistoryStore, StoreHealth } from "./history-store.js";
import { RoomPersistenceCoordinator } from "./room-persistence.js";

class RecordingStore implements GameHistoryStore {
  readonly enabled = true;
  readonly turns: number[] = [];
  readonly firstStarted: Promise<void>;
  readonly releaseFirst: () => void;
  private readonly firstGate: Promise<void>;

  constructor() {
    let markStarted: () => void = () => {};
    let releaseFirst: () => void = () => {};
    this.firstStarted = new Promise<void>((resolve) => { markStarted = resolve; });
    this.firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    this.markFirstStarted = markStarted;
    this.releaseFirst = releaseFirst;
  }

  private readonly markFirstStarted: () => void;

  async close() {}
  async health(): Promise<StoreHealth> { return { enabled: true, ok: true }; }
  async loadActiveRooms(): Promise<RoomSnapshot[]> { return []; }
  async getReplay() { return null; }
  async recordMove() {}
  async recordRoomSnapshot(room: RoomSnapshot) {
    const turn = room.game?.turnNumber ?? 0;
    if (turn === 1) {
      this.markFirstStarted();
      await this.firstGate;
    }
    this.turns.push(turn);
  }
}

const roomAtTurn = (turnNumber: number): RoomSnapshot => ({
  code: "ROOM01",
  mode: "private",
  status: "playing",
  hostPlayerId: "p1",
  players: [
    { id: "p1", nickname: "One", avatarId: "orbit", isGuest: true, ready: true, connected: true },
    { id: "p2", nickname: "Two", avatarId: "prism", isGuest: true, ready: true, connected: true },
  ],
  game: {
    id: "game-1",
    mode: "private",
    config: {
      boardSize: 5,
      targetScore: 7,
      colors: ["colorA", "colorB", "colorC"],
      scoreRules: { 3: 1, 4: 2, 5: 4 },
      turnTimeLimitSeconds: 60,
    },
    board: Array.from({ length: 5 }, () => Array(5).fill(null)),
    players: [
      { id: "p1", nickname: "One", avatarId: "orbit", score: 0, connectionStatus: "connected", isGuest: true },
      { id: "p2", nickname: "Two", avatarId: "prism", score: 0, connectionStatus: "connected", isGuest: true },
    ],
    currentPlayerId: "p1",
    status: "playing",
    result: null,
    winnerId: null,
    turnNumber,
    turnTimer: { startedAt: 0, expiresAt: 60_000 },
    lastMove: null,
  },
  createdAt: 0,
  updatedAt: turnNumber,
});

describe("RoomPersistenceCoordinator", () => {
  it("serializes writes for a room and captures immutable snapshots", async () => {
    const store = new RecordingStore();
    const coordinator = new RoomPersistenceCoordinator(store);
    const first = roomAtTurn(1);
    const firstTask = coordinator.enqueue(first);
    first.game!.turnNumber = 99;
    const secondTask = coordinator.enqueue(roomAtTurn(2));

    await store.firstStarted;
    expect(store.turns).toEqual([]);
    store.releaseFirst();
    await Promise.all([firstTask, secondTask]);

    expect(store.turns).toEqual([1, 2]);
  });
});
