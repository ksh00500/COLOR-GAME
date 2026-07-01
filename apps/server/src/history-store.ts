import { Pool, type PoolClient, type PoolConfig } from "pg";
import type { GameReplay, GameState, Move, RoomSnapshot } from "@color-game/shared-types";

export interface StoreHealth {
  enabled: boolean;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface GameHistoryStore {
  readonly enabled: boolean;
  close(): Promise<void>;
  health(): Promise<StoreHealth>;
  loadActiveRooms(): Promise<RoomSnapshot[]>;
  getReplay(gameId: string): Promise<GameReplay | null>;
  recordRoomSnapshot(room: RoomSnapshot): Promise<void>;
  recordMove(room: RoomSnapshot, move: Move): Promise<void>;
}

export class NullGameHistoryStore implements GameHistoryStore {
  readonly enabled = false;

  async close(): Promise<void> {
    return undefined;
  }

  async health(): Promise<StoreHealth> {
    return { enabled: false, ok: true };
  }

  async loadActiveRooms(): Promise<RoomSnapshot[]> {
    return [];
  }

  async getReplay(): Promise<GameReplay | null> {
    return null;
  }

  async recordRoomSnapshot(): Promise<void> {
    return undefined;
  }

  async recordMove(): Promise<void> {
    return undefined;
  }
}

export interface PostgresGameHistoryStoreOptions {
  connectionString: string;
  ssl?: boolean;
}

const toDate = (timestamp: number): Date => new Date(timestamp);

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class PostgresGameHistoryStore implements GameHistoryStore {
  readonly enabled = true;

  private readonly pool: Pool;

  constructor(options: PostgresGameHistoryStoreOptions) {
    const poolConfig: PoolConfig = {
      connectionString: options.connectionString,
    };

    if (options.ssl === true) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    this.pool = new Pool(poolConfig);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async health(): Promise<StoreHealth> {
    const startedAt = Date.now();
    try {
      await this.pool.query("select 1");
      return {
        enabled: true,
        ok: true,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        enabled: true,
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: errorMessage(error),
      };
    }
  }

  async loadActiveRooms(): Promise<RoomSnapshot[]> {
    const result = await this.pool.query<{ last_snapshot: RoomSnapshot }>(
      `
        select last_snapshot
        from game_rooms
        where status <> 'finished'
          and last_snapshot is not null
        order by created_at asc
      `,
    );

    return result.rows
      .map((row) => row.last_snapshot)
      .filter((room): room is RoomSnapshot => room?.code !== undefined);
  }

  async getReplay(gameId: string): Promise<GameReplay | null> {
    const gameResult = await this.pool.query<{
      id: string;
      room_code: string;
      mode: GameReplay["mode"];
      state: GameState;
      started_at: Date;
      finished_at: Date | null;
    }>(
      `
        select id, room_code, mode, state, started_at, finished_at
        from games
        where id = $1
          and status = 'finished'
      `,
      [gameId],
    );
    const game = gameResult.rows[0];
    if (game === undefined) return null;

    const moveResult = await this.pool.query<{
      player_id: string;
      row_index: number;
      col_index: number;
      color: Move["color"];
      earned_score: number;
      scoring_lines: Move["scoringLines"];
      removed_cells: Move["removedCells"];
      turn_number: number;
      created_at: Date;
    }>(
      `
        select player_id, row_index, col_index, color, earned_score,
          scoring_lines, removed_cells, turn_number, created_at
        from game_moves
        where game_id = $1
        order by turn_number asc
      `,
      [gameId],
    );

    return {
      gameId: game.id,
      roomCode: game.room_code,
      mode: game.mode,
      finalState: game.state,
      moves: moveResult.rows.map((move) => ({
        playerId: move.player_id,
        row: move.row_index,
        col: move.col_index,
        color: move.color,
        earnedScore: move.earned_score,
        scoringLines: move.scoring_lines,
        removedCells: move.removed_cells,
        turnNumber: move.turn_number,
        createdAt: move.created_at.getTime(),
      })),
      startedAt: game.started_at.toISOString(),
      finishedAt: game.finished_at?.toISOString() ?? null,
    };
  }

  async recordRoomSnapshot(room: RoomSnapshot): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.upsertRoom(client, room);
      await this.upsertPlayers(client, room);
      if (room.game !== null) {
        await this.upsertGame(client, room);
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async recordMove(room: RoomSnapshot, move: Move): Promise<void> {
    if (room.game === null) return;

    await this.pool.query(
      `
        insert into game_moves (
          game_id,
          room_code,
          player_id,
          turn_number,
          row_index,
          col_index,
          color,
          earned_score,
          scoring_lines,
          removed_cells,
          created_at
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9::jsonb, $10::jsonb, $11
        )
        on conflict (game_id, turn_number) do nothing
      `,
      [
        room.game.id,
        room.code,
        move.playerId,
        move.turnNumber,
        move.row,
        move.col,
        move.color,
        move.earnedScore,
        JSON.stringify(move.scoringLines),
        JSON.stringify(move.removedCells),
        toDate(move.createdAt),
      ],
    );
  }

  private async upsertRoom(client: PoolClient, room: RoomSnapshot): Promise<void> {
    await client.query(
      `
        insert into game_rooms (
          code,
          mode,
          status,
          host_player_id,
          current_game_id,
          last_snapshot,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        on conflict (code) do update set
          mode = excluded.mode,
          status = excluded.status,
          host_player_id = excluded.host_player_id,
          current_game_id = excluded.current_game_id,
          last_snapshot = excluded.last_snapshot,
          updated_at = excluded.updated_at
      `,
      [
        room.code,
        room.mode,
        room.status,
        room.hostPlayerId,
        room.game?.id ?? null,
        JSON.stringify(room),
        toDate(room.createdAt),
        toDate(room.updatedAt),
      ],
    );
  }

  private async upsertPlayers(client: PoolClient, room: RoomSnapshot): Promise<void> {
    const players = room.players
      .map((player, seatIndex) => ({ player, seatIndex }))
      .filter((entry): entry is { player: NonNullable<typeof entry.player>; seatIndex: number } => entry.player !== null);

    for (const { player, seatIndex } of players) {
      await client.query(
        `
          insert into game_room_players (
            room_code,
            player_id,
            account_id,
            seat_index,
            nickname,
            avatar_id,
            is_guest,
            ready,
            connected,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10)
          on conflict (room_code, player_id) do update set
            account_id = excluded.account_id,
            seat_index = excluded.seat_index,
            nickname = excluded.nickname,
            avatar_id = excluded.avatar_id,
            is_guest = excluded.is_guest,
            ready = excluded.ready,
            connected = excluded.connected,
            updated_at = excluded.updated_at
        `,
        [
          room.code,
          player.id,
          player.accountId ?? null,
          seatIndex,
          player.nickname,
          player.avatarId,
          player.isGuest,
          player.ready,
          player.connected,
          toDate(room.updatedAt),
        ],
      );
    }
  }

  private async upsertGame(client: PoolClient, room: RoomSnapshot): Promise<void> {
    const game = room.game;
    if (game === null) return;

    const startedAt = game.startedAt ?? room.createdAt;
    const finishedAt = game.status === "finished"
      ? game.finishedAt ?? room.updatedAt
      : null;

    await client.query(
      `
        insert into games (
          id,
          room_code,
          status,
          mode,
          current_player_id,
          winner_id,
          result,
          turn_number,
          state,
          started_at,
          finished_at,
          updated_at
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9::jsonb, $10, $11, $12
        )
        on conflict (id) do update set
          status = excluded.status,
          current_player_id = excluded.current_player_id,
          winner_id = excluded.winner_id,
          result = excluded.result,
          turn_number = excluded.turn_number,
          state = excluded.state,
          finished_at = excluded.finished_at,
          updated_at = excluded.updated_at
      `,
      [
        game.id,
        room.code,
        game.status,
        game.mode,
        game.currentPlayerId,
        game.winnerId,
        game.result,
        game.turnNumber,
        JSON.stringify(game),
        toDate(startedAt),
        finishedAt === null ? null : toDate(finishedAt),
        toDate(room.updatedAt),
      ],
    );
  }
}

export const createGameHistoryStoreFromEnv = (): GameHistoryStore => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString.trim() === "") {
    return new NullGameHistoryStore();
  }

  const ssl = process.env.DATABASE_SSL === "true";
  return new PostgresGameHistoryStore({ connectionString, ssl });
};
