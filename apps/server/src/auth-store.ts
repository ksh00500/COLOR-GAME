import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import { Pool, type PoolConfig } from "pg";
import type { GamePlayer, RoomSnapshot } from "@color-game/shared-types";
import { nextAttendanceStreak } from "./attendance.js";

const scrypt = promisify(scryptCallback);
const kFactor = 32;

export interface AccountSummary {
  id: string;
  email: string;
  displayName: string;
  avatarId: string;
  rating: number;
  gamesPlayed: number;
  rankedWins: number;
  rankedLosses: number;
  rankedDraws: number;
  attendanceStreak: number;
  longestAttendanceStreak: number;
  lastAttendanceDate: string | null;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  avatarId: string;
  rating: number;
  gamesPlayed: number;
  rankedWins: number;
  rankedLosses: number;
  rankedDraws: number;
}

export interface MatchHistoryItem {
  gameId: string;
  roomCode: string;
  mode: string;
  opponentName: string;
  result: string | null;
  winnerAccountId: string | null;
  ratingBefore: Record<string, number>;
  ratingAfter: Record<string, number>;
  turnNumber: number;
  finishedAt: string;
}

export interface AuthTokenPayload {
  accountId: string;
  exp: number;
}

export interface AccountStore {
  readonly enabled: boolean;
  close(): Promise<void>;
  register(input: {
    email: string;
    password: string;
    displayName: string;
    avatarId: string;
  }): Promise<AccountSummary>;
  authenticate(email: string, password: string): Promise<AccountSummary | null>;
  getAccount(accountId: string): Promise<AccountSummary | null>;
  getPublicProfile(accountId: string): Promise<PublicProfile | null>;
  getLeaderboard(limit: number): Promise<PublicProfile[]>;
  getMatchHistory(accountId: string, limit: number): Promise<MatchHistoryItem[]>;
  checkInAttendance(accountId: string, attendedOn: string): Promise<AccountSummary | null>;
  recordFinishedRoom(room: RoomSnapshot): Promise<void>;
}

export class NullAccountStore implements AccountStore {
  readonly enabled = false;

  async close(): Promise<void> {
    return undefined;
  }

  async register(): Promise<AccountSummary> {
    throw new Error("Account store is disabled.");
  }

  async authenticate(): Promise<AccountSummary | null> {
    return null;
  }

  async getAccount(): Promise<AccountSummary | null> {
    return null;
  }

  async getPublicProfile(): Promise<PublicProfile | null> {
    return null;
  }

  async getLeaderboard(): Promise<PublicProfile[]> {
    return [];
  }

  async getMatchHistory(): Promise<MatchHistoryItem[]> {
    return [];
  }

  async checkInAttendance(): Promise<AccountSummary | null> {
    return null;
  }

  async recordFinishedRoom(): Promise<void> {
    return undefined;
  }
}

export interface PostgresAccountStoreOptions {
  connectionString: string;
  ssl?: boolean;
}

interface AccountRow {
  id: string;
  email: string;
  display_name: string;
  avatar_id: string;
  password_hash: string;
  rating: number;
  games_played: number;
  ranked_wins: number;
  ranked_losses: number;
  ranked_draws: number;
  attendance_streak: number;
  longest_attendance_streak: number;
  last_attendance_date: string | null;
  created_at: Date;
}

interface MatchRow {
  game_id: string;
  room_code: string;
  mode: string;
  player_one_account_id: string | null;
  player_two_account_id: string | null;
  player_one_nickname: string;
  player_two_nickname: string;
  winner_account_id: string | null;
  result: string | null;
  rating_before: Record<string, number>;
  rating_after: Record<string, number>;
  turn_number: number;
  finished_at: Date;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const toAccountSummary = (row: AccountRow): AccountSummary => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  avatarId: row.avatar_id,
  rating: row.rating,
  gamesPlayed: row.games_played,
  rankedWins: row.ranked_wins,
  rankedLosses: row.ranked_losses,
  rankedDraws: row.ranked_draws,
  attendanceStreak: row.attendance_streak,
  longestAttendanceStreak: row.longest_attendance_streak,
  lastAttendanceDate: row.last_attendance_date,
  createdAt: row.created_at.toISOString(),
});

const toPublicProfile = (row: AccountRow): PublicProfile => ({
  id: row.id,
  displayName: row.display_name,
  avatarId: row.avatar_id,
  rating: row.rating,
  gamesPlayed: row.games_played,
  rankedWins: row.ranked_wins,
  rankedLosses: row.ranked_losses,
  rankedDraws: row.ranked_draws,
});

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString("base64url");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${key.toString("base64url")}`;
};

const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [algorithm, salt, expected] = stored.split("$");
  if (algorithm !== "scrypt" || salt === undefined || expected === undefined) {
    return false;
  }

  const key = (await scrypt(password, salt, 64)) as Buffer;
  const expectedBuffer = Buffer.from(expected, "base64url");
  return expectedBuffer.length === key.length && timingSafeEqual(expectedBuffer, key);
};

const expectedScore = (rating: number, opponentRating: number): number =>
  1 / (1 + 10 ** ((opponentRating - rating) / 400));

const nextRating = (rating: number, opponentRating: number, score: number): number =>
  Math.round(rating + kFactor * (score - expectedScore(rating, opponentRating)));

const scoreFor = (player: GamePlayer, opponent: GamePlayer, winnerId: string | null): number => {
  if (winnerId === null) return 0.5;
  if (winnerId === player.id) return 1;
  if (winnerId === opponent.id) return 0;
  return 0.5;
};

const accountIdFor = (player: GamePlayer): string | null => player.accountId ?? null;

export class PostgresAccountStore implements AccountStore {
  readonly enabled = true;

  private readonly pool: Pool;

  constructor(options: PostgresAccountStoreOptions) {
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

  async register(input: {
    email: string;
    password: string;
    displayName: string;
    avatarId: string;
  }): Promise<AccountSummary> {
    const passwordHash = await hashPassword(input.password);
    const result = await this.pool.query<AccountRow>(
      `
        insert into accounts (id, email, display_name, avatar_id, password_hash)
        values ($1, $2, $3, $4, $5)
        returning *
      `,
      [
        randomUUID(),
        normalizeEmail(input.email),
        input.displayName.trim(),
        input.avatarId,
        passwordHash,
      ],
    );

    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Account registration failed.");
    }
    return toAccountSummary(row);
  }

  async authenticate(email: string, password: string): Promise<AccountSummary | null> {
    const result = await this.pool.query<AccountRow>(
      "select * from accounts where email = $1",
      [normalizeEmail(email)],
    );
    const row = result.rows[0];
    if (row === undefined) return null;

    const ok = await verifyPassword(password, row.password_hash);
    return ok ? toAccountSummary(row) : null;
  }

  async getAccount(accountId: string): Promise<AccountSummary | null> {
    const result = await this.pool.query<AccountRow>(
      "select * from accounts where id = $1",
      [accountId],
    );
    const row = result.rows[0];
    return row === undefined ? null : toAccountSummary(row);
  }

  async getPublicProfile(accountId: string): Promise<PublicProfile | null> {
    const result = await this.pool.query<AccountRow>(
      "select * from accounts where id = $1",
      [accountId],
    );
    const row = result.rows[0];
    return row === undefined ? null : toPublicProfile(row);
  }

  async getLeaderboard(limit: number): Promise<PublicProfile[]> {
    const result = await this.pool.query<AccountRow>(
      `
        select *
        from accounts
        order by rating desc, ranked_wins desc, games_played asc, created_at asc
        limit $1
      `,
      [limit],
    );

    return result.rows.map(toPublicProfile);
  }

  async getMatchHistory(accountId: string, limit: number): Promise<MatchHistoryItem[]> {
    const result = await this.pool.query<MatchRow>(
      `
        select *
        from match_results
        where player_one_account_id = $1 or player_two_account_id = $1
        order by finished_at desc
        limit $2
      `,
      [accountId, limit],
    );

    return result.rows.map((row) => ({
      gameId: row.game_id,
      roomCode: row.room_code,
      mode: row.mode,
      opponentName:
        row.player_one_account_id === accountId
          ? row.player_two_nickname
          : row.player_one_nickname,
      result: row.result,
      winnerAccountId: row.winner_account_id,
      ratingBefore: row.rating_before,
      ratingAfter: row.rating_after,
      turnNumber: row.turn_number,
      finishedAt: row.finished_at.toISOString(),
    }));
  }

  async checkInAttendance(accountId: string, attendedOn: string): Promise<AccountSummary | null> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const accountResult = await client.query<AccountRow>(
        "select * from accounts where id = $1 for update",
        [accountId],
      );
      const account = accountResult.rows[0];
      if (account === undefined) {
        await client.query("rollback");
        return null;
      }

      if (account.last_attendance_date === attendedOn) {
        await client.query("commit");
        return toAccountSummary(account);
      }

      const nextStreak = nextAttendanceStreak(
        account.last_attendance_date,
        attendedOn,
        account.attendance_streak,
      );
      const nextLongest = Math.max(account.longest_attendance_streak, nextStreak);

      await client.query(
        `
          insert into attendance_days (account_id, attended_on)
          values ($1, $2::date)
          on conflict (account_id, attended_on) do nothing
        `,
        [accountId, attendedOn],
      );
      const updated = await client.query<AccountRow>(
        `
          update accounts set
            attendance_streak = $2,
            longest_attendance_streak = $3,
            last_attendance_date = $4::date,
            updated_at = now()
          where id = $1
          returning *
        `,
        [accountId, nextStreak, nextLongest, attendedOn],
      );
      await client.query("commit");
      const row = updated.rows[0];
      return row === undefined ? null : toAccountSummary(row);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async recordFinishedRoom(room: RoomSnapshot): Promise<void> {
    const game = room.game;
    if (game === null || game.status !== "finished") return;

    const [first, second] = game.players;
    const firstAccountId = accountIdFor(first);
    const secondAccountId = accountIdFor(second);
    const winner = game.players.find((player) => player.id === game.winnerId);
    const winnerAccountId = winner === undefined ? null : accountIdFor(winner);

    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const alreadyRecorded = await client.query(
        "select 1 from match_results where game_id = $1",
        [game.id],
      );
      if (alreadyRecorded.rowCount !== null && alreadyRecorded.rowCount > 0) {
        await client.query("commit");
        return;
      }

      const accountIds = [firstAccountId, secondAccountId].filter(
        (id): id is string => id !== null,
      );
      const accountRows = accountIds.length === 0
        ? []
        : (
            await client.query<AccountRow>(
              "select * from accounts where id = any($1::text[]) for update",
              [accountIds],
            )
          ).rows;

      const byId = new Map(accountRows.map((row) => [row.id, row]));
      const firstRow = firstAccountId === null ? undefined : byId.get(firstAccountId);
      const secondRow = secondAccountId === null ? undefined : byId.get(secondAccountId);
      const ratingBefore: Record<string, number> = {};
      const ratingAfter: Record<string, number> = {};

      if (firstRow !== undefined) ratingBefore[firstRow.id] = firstRow.rating;
      if (secondRow !== undefined) ratingBefore[secondRow.id] = secondRow.rating;

      if (room.mode === "ranked" && firstRow !== undefined && secondRow !== undefined) {
        const firstScore = scoreFor(first, second, game.winnerId);
        const secondScore = scoreFor(second, first, game.winnerId);
        ratingAfter[firstRow.id] = nextRating(firstRow.rating, secondRow.rating, firstScore);
        ratingAfter[secondRow.id] = nextRating(secondRow.rating, firstRow.rating, secondScore);
      } else {
        if (firstRow !== undefined) ratingAfter[firstRow.id] = firstRow.rating;
        if (secondRow !== undefined) ratingAfter[secondRow.id] = secondRow.rating;
      }

      await client.query(
        `
          insert into match_results (
            game_id,
            room_code,
            mode,
            player_one_account_id,
            player_two_account_id,
            player_one_nickname,
            player_two_nickname,
            winner_account_id,
            result,
            rating_before,
            rating_after,
            turn_number,
            finished_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10::jsonb, $11::jsonb, $12, $13
          )
        `,
        [
          game.id,
          room.code,
          room.mode,
          firstAccountId,
          secondAccountId,
          first.nickname,
          second.nickname,
          winnerAccountId,
          game.result,
          JSON.stringify(ratingBefore),
          JSON.stringify(ratingAfter),
          game.turnNumber,
          new Date(room.updatedAt),
        ],
      );

      for (const row of accountRows) {
        const player = [first, second].find((candidate) => candidate.accountId === row.id);
        if (player === undefined) continue;
        const score = scoreFor(player, player.id === first.id ? second : first, game.winnerId);
        const isRanked = room.mode === "ranked";
        await client.query(
          `
            update accounts set
              rating = $2,
              games_played = games_played + 1,
              ranked_wins = ranked_wins + $3,
              ranked_losses = ranked_losses + $4,
              ranked_draws = ranked_draws + $5,
              updated_at = now()
            where id = $1
          `,
          [
            row.id,
            ratingAfter[row.id] ?? row.rating,
            isRanked && score === 1 ? 1 : 0,
            isRanked && score === 0 ? 1 : 0,
            isRanked && score === 0.5 ? 1 : 0,
          ],
        );
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}

export const createAccountStoreFromEnv = (): AccountStore => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString.trim() === "") {
    return new NullAccountStore();
  }

  return new PostgresAccountStore({
    connectionString,
    ssl: process.env.DATABASE_SSL === "true",
  });
};

const encodeBase64Url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

const sign = (value: string, secret: string): string =>
  createHmac("sha256", secret).update(value).digest("base64url");

export const createAuthToken = (
  accountId: string,
  secret: string,
  ttlSeconds: number,
): string => {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: accountId,
      exp: Math.floor(Date.now() / 1_000) + ttlSeconds,
    }),
  );
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
};

export const verifyAuthToken = (
  token: string,
  secret: string,
): AuthTokenPayload | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  if (header === undefined || payload === undefined || signature === undefined) return null;

  const unsigned = `${header}.${payload}`;
  const expected = sign(unsigned, secret);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.sub !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= Math.floor(Date.now() / 1_000)) return null;
    return { accountId: parsed.sub, exp: parsed.exp };
  } catch {
    return null;
  }
};
