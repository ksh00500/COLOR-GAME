import type { Move, RoomSnapshot } from "@color-game/shared-types";
import type { GameHistoryStore } from "./history-store.js";

type AfterPersist = (room: RoomSnapshot) => Promise<void>;

export class RoomPersistenceCoordinator {
  private readonly tails = new Map<string, Promise<void>>();
  private readonly pending = new Set<Promise<void>>();

  constructor(private readonly store: GameHistoryStore) {}

  enqueue(
    room: RoomSnapshot,
    move: Move | null = null,
    afterPersist?: AfterPersist,
  ): Promise<void> {
    if (!this.store.enabled) {
      return afterPersist === undefined
        ? Promise.resolve()
        : afterPersist(structuredClone(room));
    }

    const roomSnapshot = structuredClone(room);
    const moveSnapshot = move === null ? null : structuredClone(move);
    const previous = this.tails.get(room.code) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(async () => {
        await this.store.recordRoomSnapshot(roomSnapshot);
        if (moveSnapshot !== null) {
          await this.store.recordMove(roomSnapshot, moveSnapshot);
        }
        await afterPersist?.(roomSnapshot);
      });

    this.tails.set(room.code, current);
    this.pending.add(current);
    void current.then(
      () => this.cleanup(room.code, current),
      () => this.cleanup(room.code, current),
    );
    return current;
  }

  async drain(): Promise<void> {
    await Promise.allSettled([...this.pending]);
  }

  private cleanup(roomCode: string, task: Promise<void>): void {
    this.pending.delete(task);
    if (this.tails.get(roomCode) === task) {
      this.tails.delete(roomCode);
    }
  }
}
