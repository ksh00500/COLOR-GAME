import { Pool, type PoolConfig } from "pg";

export interface VisitorCounts {
  realtime: number;
  daily: number;
  monthly: number;
  updatedAt: string;
}

export interface AnalyticsStore {
  readonly enabled: boolean;
  close(): Promise<void>;
  recordHeartbeat(input: {
    visitorId: string;
    path: string | null;
    userAgent: string | null;
  }): Promise<void>;
  getVisitorCounts(now?: Date): Promise<VisitorCounts>;
}

const emptyCounts = (now = new Date()): VisitorCounts => ({
  realtime: 0,
  daily: 0,
  monthly: 0,
  updatedAt: now.toISOString(),
});

export class NullAnalyticsStore implements AnalyticsStore {
  readonly enabled = false;

  async close(): Promise<void> {
    return undefined;
  }

  async recordHeartbeat(): Promise<void> {
    return undefined;
  }

  async getVisitorCounts(now = new Date()): Promise<VisitorCounts> {
    return emptyCounts(now);
  }
}

export interface PostgresAnalyticsStoreOptions {
  connectionString: string;
  ssl?: boolean;
}

const kstOffsetMs = 9 * 60 * 60 * 1_000;

const getKstPeriodStarts = (now: Date) => {
  const shifted = new Date(now.getTime() + kstOffsetMs);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const date = shifted.getUTCDate();

  return {
    dayStart: new Date(Date.UTC(year, month, date) - kstOffsetMs),
    monthStart: new Date(Date.UTC(year, month, 1) - kstOffsetMs),
  };
};

export class PostgresAnalyticsStore implements AnalyticsStore {
  readonly enabled = true;

  private readonly pool: Pool;

  constructor(options: PostgresAnalyticsStoreOptions) {
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

  async recordHeartbeat(input: {
    visitorId: string;
    path: string | null;
    userAgent: string | null;
  }): Promise<void> {
    await this.pool.query(
      `
        insert into visitor_sessions (
          visitor_id,
          first_seen_at,
          last_seen_at,
          user_agent,
          last_path
        )
        values ($1, now(), now(), $2, $3)
        on conflict (visitor_id) do update set
          last_seen_at = now(),
          user_agent = excluded.user_agent,
          last_path = excluded.last_path
      `,
      [input.visitorId, input.userAgent, input.path],
    );
  }

  async getVisitorCounts(now = new Date()): Promise<VisitorCounts> {
    const { dayStart, monthStart } = getKstPeriodStarts(now);
    const realtimeStart = new Date(now.getTime() - 60_000);
    const result = await this.pool.query<{
      realtime: string;
      daily: string;
      monthly: string;
    }>(
      `
        select
          count(*) filter (where last_seen_at >= $1)::text as realtime,
          count(*) filter (where last_seen_at >= $2)::text as daily,
          count(*) filter (where last_seen_at >= $3)::text as monthly
        from visitor_sessions
      `,
      [realtimeStart, dayStart, monthStart],
    );
    const row = result.rows[0];

    return {
      realtime: Number(row?.realtime ?? 0),
      daily: Number(row?.daily ?? 0),
      monthly: Number(row?.monthly ?? 0),
      updatedAt: now.toISOString(),
    };
  }
}

export const createAnalyticsStoreFromEnv = (): AnalyticsStore => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString.trim() === "") {
    return new NullAnalyticsStore();
  }

  const ssl = process.env.DATABASE_SSL === "true";
  return new PostgresAnalyticsStore({ connectionString, ssl });
};
