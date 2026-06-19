import { Pool, type PoolConfig } from "pg";
import type { MatchmakingSegment } from "@color-game/shared-types";

export type MatchmakingMode = "casual" | "ranked";
export type WaitEstimateBasis = "segment" | "mode" | "default";

export interface WaitSample {
  mode: MatchmakingMode;
  segment: MatchmakingSegment;
  accountId: string | null;
  waitMs: number;
  matchedAt: Date;
}

export interface WaitEstimate {
  waitMs: number | null;
  sampleCount: number;
  basis: WaitEstimateBasis;
}

export interface MatchmakingWaitStore {
  readonly enabled: boolean;
  close(): Promise<void>;
  recordSamples(samples: WaitSample[]): Promise<void>;
  getEstimate(mode: MatchmakingMode, segment: MatchmakingSegment): Promise<WaitEstimate>;
}

export const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

export class NullMatchmakingWaitStore implements MatchmakingWaitStore {
  readonly enabled = false;
  async close() {}
  async recordSamples() {}
  async getEstimate(): Promise<WaitEstimate> {
    return { waitMs: null, sampleCount: 0, basis: "default" };
  }
}

export interface PostgresMatchmakingWaitStoreOptions {
  connectionString: string;
  ssl?: boolean;
  minimumSegmentSamples?: number;
  sampleLimit?: number;
  retentionDays?: number;
}

export class PostgresMatchmakingWaitStore implements MatchmakingWaitStore {
  readonly enabled = true;
  private readonly pool: Pool;
  private readonly minimumSegmentSamples: number;
  private readonly sampleLimit: number;
  private readonly retentionDays: number;

  constructor(options: PostgresMatchmakingWaitStoreOptions) {
    const poolConfig: PoolConfig = { connectionString: options.connectionString };
    if (options.ssl === true) poolConfig.ssl = { rejectUnauthorized: false };
    this.pool = new Pool(poolConfig);
    this.minimumSegmentSamples = options.minimumSegmentSamples ?? 5;
    this.sampleLimit = options.sampleLimit ?? 200;
    this.retentionDays = options.retentionDays ?? 30;
  }

  async close() {
    await this.pool.end();
  }

  async recordSamples(samples: WaitSample[]) {
    if (samples.length === 0) return;
    const values: unknown[] = [];
    const rows = samples.map((sample, index) => {
      const offset = index * 5;
      values.push(sample.mode, sample.segment, sample.accountId, sample.waitMs, sample.matchedAt);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
    });
    await this.pool.query(
      `insert into matchmaking_wait_samples (mode, segment, account_id, wait_ms, matched_at)
       values ${rows.join(", ")}`,
      values,
    );
  }

  async getEstimate(mode: MatchmakingMode, segment: MatchmakingSegment): Promise<WaitEstimate> {
    const segmentValues = await this.loadRecent(mode, segment);
    if (segmentValues.length >= this.minimumSegmentSamples) {
      return { waitMs: median(segmentValues), sampleCount: segmentValues.length, basis: "segment" };
    }
    const modeValues = await this.loadRecent(mode, null);
    if (modeValues.length > 0) {
      return { waitMs: median(modeValues), sampleCount: modeValues.length, basis: "mode" };
    }
    return { waitMs: null, sampleCount: 0, basis: "default" };
  }

  private async loadRecent(mode: MatchmakingMode, segment: MatchmakingSegment | null) {
    const result = await this.pool.query<{ wait_ms: number }>(
      `select wait_ms
       from matchmaking_wait_samples
       where mode = $1
         and ($2::text is null or segment = $2)
         and matched_at >= now() - ($3 * interval '1 day')
       order by matched_at desc
       limit $4`,
      [mode, segment, this.retentionDays, this.sampleLimit],
    );
    return result.rows.map((row) => row.wait_ms);
  }
}

export const createMatchmakingWaitStoreFromEnv = (): MatchmakingWaitStore => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString.trim() === "") {
    return new NullMatchmakingWaitStore();
  }
  return new PostgresMatchmakingWaitStore({
    connectionString,
    ssl: process.env.DATABASE_SSL === "true",
  });
};
