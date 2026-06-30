import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { Pool, type PoolClient, type PoolConfig } from "pg";
import type { CosmeticRarity } from "./economy-store.js";

const scrypt = promisify(scryptCallback);

export type CouponReward =
  | { type: "color_chips"; amount: number }
  | { type: "palette_box_ticket"; amount: number }
  | { type: "fragments"; rarity: CosmeticRarity; amount: number }
  | { type: "cosmetic"; cosmeticId: string }
  | { type: "random_cosmetic"; cosmeticIds: string[]; pickCount: number }
  | { type: "entitlement"; entitlement: "premium" };

export interface CouponRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  rewards: CouponReward[];
  startsAt: string | null;
  expiresAt: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponInput {
  code: string;
  name: string;
  description?: string | undefined;
  rewards: CouponReward[];
  startsAt?: string | null | undefined;
  expiresAt?: string | null | undefined;
  maxRedemptions?: number | null | undefined;
  active?: boolean | undefined;
}

export interface CouponRedemptionResult {
  coupon: { id: string; code: string; name: string };
  rewards: Array<{
    type: CouponReward["type"];
    amount?: number;
    rarity?: CosmeticRarity;
    cosmeticId?: string;
    cosmeticName?: string;
    convertedToFragment?: boolean;
    entitlement?: "premium";
  }>;
}

export interface AdminSummary {
  id: string;
  email: string;
  displayName: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  rating: number;
  gamesPlayed: number;
  rankedWins: number;
  rankedLosses: number;
  rankedDraws: number;
  colorChips: number;
  boxTickets: number;
  cosmeticCount: number;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
}

export interface AdminAuditEntry {
  id: string;
  adminId: string | null;
  adminEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AdminCatalogItem {
  id: string;
  nameKo: string;
  rarity: CosmeticRarity;
  visualKind: "solid" | "split" | "gradient" | "pattern" | "placeholder";
  colors: string[];
  pattern: string | null;
  splitAngle: number | null;
}

export interface AdminStore {
  readonly enabled: boolean;
  close(): Promise<void>;
  upsertBootstrapAdmin(email: string, password: string): Promise<AdminSummary>;
  authenticate(email: string, password: string): Promise<AdminSummary | null>;
  rotateSession(adminId: string): Promise<string | null>;
  getAdminForSession(adminId: string, sessionId: string): Promise<AdminSummary | null>;
  listCoupons(): Promise<CouponRecord[]>;
  createCoupon(adminId: string, input: CouponInput): Promise<CouponRecord>;
  updateCoupon(adminId: string, couponId: string, input: CouponInput): Promise<CouponRecord | null>;
  deleteCoupon(adminId: string, couponId: string): Promise<boolean>;
  redeemCoupon(accountId: string, code: string): Promise<CouponRedemptionResult>;
  listUsers(query: string, limit: number): Promise<ManagedUser[]>;
  adjustUserChips(adminId: string, accountId: string, delta: number, reason: string): Promise<ManagedUser | null>;
  grantUserCosmetic(adminId: string, accountId: string, cosmeticId: string, reason: string): Promise<boolean>;
  grantUserCosmetics(
    adminId: string,
    accountId: string,
    selection: { cosmeticIds?: string[]; rarity?: CosmeticRarity },
    reason: string,
  ): Promise<number>;
  setUserSuspension(adminId: string, accountId: string, suspended: boolean, reason: string): Promise<boolean>;
  listCatalog(): Promise<AdminCatalogItem[]>;
  listAudit(limit: number): Promise<AdminAuditEntry[]>;
}

export class NullAdminStore implements AdminStore {
  readonly enabled = false;
  async close(): Promise<void> {}
  async upsertBootstrapAdmin(): Promise<AdminSummary> { throw new Error("ADMIN_STORE_DISABLED"); }
  async authenticate(): Promise<AdminSummary | null> { return null; }
  async rotateSession(): Promise<string | null> { return null; }
  async getAdminForSession(): Promise<AdminSummary | null> { return null; }
  async listCoupons(): Promise<CouponRecord[]> { return []; }
  async createCoupon(): Promise<CouponRecord> { throw new Error("ADMIN_STORE_DISABLED"); }
  async updateCoupon(): Promise<CouponRecord | null> { return null; }
  async deleteCoupon(): Promise<boolean> { return false; }
  async redeemCoupon(): Promise<CouponRedemptionResult> { throw new Error("COUPON_STORE_DISABLED"); }
  async listUsers(): Promise<ManagedUser[]> { return []; }
  async adjustUserChips(): Promise<ManagedUser | null> { return null; }
  async grantUserCosmetic(): Promise<boolean> { return false; }
  async grantUserCosmetics(): Promise<number> { return 0; }
  async setUserSuspension(): Promise<boolean> { return false; }
  async listCatalog(): Promise<AdminCatalogItem[]> { return []; }
  async listAudit(): Promise<AdminAuditEntry[]> { return []; }
}

interface AdminRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
}

interface CouponRow {
  id: string;
  code: string;
  name: string;
  description: string;
  rewards: CouponReward[];
  starts_at: Date | null;
  expires_at: Date | null;
  max_redemptions: number | null;
  redemption_count: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ManagedUserRow {
  id: string;
  email: string;
  display_name: string;
  rating: number;
  games_played: number;
  ranked_wins: number;
  ranked_losses: number;
  ranked_draws: number;
  color_chips: number;
  box_tickets: number;
  cosmetic_count: string;
  suspended_at: Date | null;
  suspension_reason: string | null;
  created_at: Date;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeCode = (value: string) => value.trim().toUpperCase();

export const selectRandomCosmeticCandidates = (
  cosmeticIds: string[],
  ownedIds: Set<string>,
  pickCount: number,
  randomIndex: (upperExclusive: number) => number = (upperExclusive) => randomInt(upperExclusive),
): string[] => {
  const shuffle = (values: string[]) => {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = randomIndex(index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
    }
    return result;
  };
  const unique = [...new Set(cosmeticIds)];
  const unowned = shuffle(unique.filter((id) => !ownedIds.has(id)));
  const owned = shuffle(unique.filter((id) => ownedIds.has(id)));
  return [...unowned, ...owned].slice(0, Math.min(pickCount, unique.length));
};

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
};

const verifyPassword = async (password: string, encoded: string): Promise<boolean> => {
  const [algorithm, saltValue, hashValue] = encoded.split("$");
  if (algorithm !== "scrypt" || saltValue === undefined || hashValue === undefined) return false;
  const expected = Buffer.from(hashValue, "base64url");
  const actual = await scrypt(password, Buffer.from(saltValue, "base64url"), expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const toAdmin = (row: AdminRow): AdminSummary => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
});

const toCoupon = (row: CouponRow): CouponRecord => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  rewards: row.rewards,
  startsAt: row.starts_at?.toISOString() ?? null,
  expiresAt: row.expires_at?.toISOString() ?? null,
  maxRedemptions: row.max_redemptions,
  redemptionCount: Number.parseInt(row.redemption_count, 10),
  active: row.active,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const toManagedUser = (row: ManagedUserRow): ManagedUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  rating: row.rating,
  gamesPlayed: row.games_played,
  rankedWins: row.ranked_wins,
  rankedLosses: row.ranked_losses,
  rankedDraws: row.ranked_draws,
  colorChips: row.color_chips,
  boxTickets: row.box_tickets,
  cosmeticCount: Number.parseInt(row.cosmetic_count, 10),
  suspendedAt: row.suspended_at?.toISOString() ?? null,
  suspensionReason: row.suspension_reason,
  createdAt: row.created_at.toISOString(),
});

const couponSelect = `
  select c.*,
    (select count(*)::text from coupon_redemptions cr where cr.coupon_id = c.id) as redemption_count
  from coupons c
`;

export class PostgresAdminStore implements AdminStore {
  readonly enabled = true;
  private readonly pool: Pool;

  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async audit(
    client: PoolClient,
    adminId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    details: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `insert into admin_audit_logs (admin_id, action, target_type, target_id, details)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [adminId, action, targetType, targetId, JSON.stringify(details)],
    );
  }

  async upsertBootstrapAdmin(email: string, password: string): Promise<AdminSummary> {
    const passwordHash = await hashPassword(password);
    const result = await this.pool.query<AdminRow>(
      `insert into admin_accounts (id, email, password_hash)
       values ($1, $2, $3)
       on conflict (email) do update set
         password_hash = excluded.password_hash,
         active = true,
         active_session_id = null,
         updated_at = now()
       returning *`,
      [randomUUID(), normalizeEmail(email), passwordHash],
    );
    const row = result.rows[0];
    if (row === undefined) throw new Error("ADMIN_BOOTSTRAP_FAILED");
    return toAdmin(row);
  }

  async authenticate(email: string, password: string): Promise<AdminSummary | null> {
    const result = await this.pool.query<AdminRow>(
      "select * from admin_accounts where email = $1 and active",
      [normalizeEmail(email)],
    );
    const row = result.rows[0];
    if (row === undefined || !(await verifyPassword(password, row.password_hash))) return null;
    await this.pool.query(
      "update admin_accounts set last_login_at = now(), updated_at = now() where id = $1",
      [row.id],
    );
    return toAdmin(row);
  }

  async rotateSession(adminId: string): Promise<string | null> {
    const sessionId = randomUUID();
    const result = await this.pool.query(
      `update admin_accounts set active_session_id = $2, updated_at = now()
       where id = $1 and active returning id`,
      [adminId, sessionId],
    );
    return (result.rowCount ?? 0) > 0 ? sessionId : null;
  }

  async getAdminForSession(adminId: string, sessionId: string): Promise<AdminSummary | null> {
    const result = await this.pool.query<AdminRow>(
      `select * from admin_accounts
       where id = $1 and active_session_id = $2 and active`,
      [adminId, sessionId],
    );
    return result.rows[0] ? toAdmin(result.rows[0]) : null;
  }

  async listCoupons(): Promise<CouponRecord[]> {
    const result = await this.pool.query<CouponRow>(
      `${couponSelect} where c.deleted_at is null order by c.created_at desc`,
    );
    return result.rows.map(toCoupon);
  }

  async createCoupon(adminId: string, input: CouponInput): Promise<CouponRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const id = randomUUID();
      await client.query(
        `insert into coupons (
           id, code, name, description, rewards, starts_at, expires_at,
           max_redemptions, active, created_by
         ) values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)`,
        [
          id,
          normalizeCode(input.code),
          input.name.trim(),
          input.description?.trim() ?? "",
          JSON.stringify(input.rewards),
          input.startsAt ?? null,
          input.expiresAt ?? null,
          input.maxRedemptions ?? null,
          input.active ?? true,
          adminId,
        ],
      );
      await this.audit(client, adminId, "coupon.create", "coupon", id, {
        code: normalizeCode(input.code),
        rewards: input.rewards,
      });
      const result = await client.query<CouponRow>(`${couponSelect} where c.id = $1`, [id]);
      await client.query("commit");
      const row = result.rows[0];
      if (row === undefined) throw new Error("COUPON_CREATE_FAILED");
      return toCoupon(row);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateCoupon(adminId: string, couponId: string, input: CouponInput): Promise<CouponRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const updated = await client.query(
        `update coupons set
           code = $2, name = $3, description = $4, rewards = $5::jsonb,
           starts_at = $6, expires_at = $7, max_redemptions = $8,
           active = $9, updated_at = now()
         where id = $1 and deleted_at is null returning id`,
        [
          couponId,
          normalizeCode(input.code),
          input.name.trim(),
          input.description?.trim() ?? "",
          JSON.stringify(input.rewards),
          input.startsAt ?? null,
          input.expiresAt ?? null,
          input.maxRedemptions ?? null,
          input.active ?? true,
        ],
      );
      if ((updated.rowCount ?? 0) === 0) {
        await client.query("rollback");
        return null;
      }
      await this.audit(client, adminId, "coupon.update", "coupon", couponId, {
        code: normalizeCode(input.code),
        rewards: input.rewards,
      });
      const result = await client.query<CouponRow>(`${couponSelect} where c.id = $1`, [couponId]);
      await client.query("commit");
      return result.rows[0] ? toCoupon(result.rows[0]) : null;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteCoupon(adminId: string, couponId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await client.query(
        `update coupons set active = false, deleted_at = now(), updated_at = now()
         where id = $1 and deleted_at is null`,
        [couponId],
      );
      if ((result.rowCount ?? 0) > 0) {
        await this.audit(client, adminId, "coupon.delete", "coupon", couponId, {});
      }
      await client.query("commit");
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureEconomyRows(client: PoolClient, accountId: string): Promise<void> {
    await client.query(
      "insert into economy_wallets (account_id) values ($1) on conflict do nothing",
      [accountId],
    );
    await client.query(
      `insert into economy_fragments (account_id, rarity)
       select $1, rarity from unnest(array['common','rare','epic','legendary']) rarity
       on conflict do nothing`,
      [accountId],
    );
    await client.query(
      "insert into account_palette_box_tickets (account_id) values ($1) on conflict do nothing",
      [accountId],
    );
  }

  private async grantCosmetic(
    client: PoolClient,
    accountId: string,
    cosmeticId: string,
    source: string,
  ): Promise<{ cosmeticId: string; cosmeticName: string; rarity: CosmeticRarity; converted: boolean }> {
    const catalog = await client.query<{ id: string; name_ko: string; rarity: CosmeticRarity }>(
      "select id, name_ko, rarity from cosmetic_catalog where id = $1 and active",
      [cosmeticId],
    );
    const item = catalog.rows[0];
    if (item === undefined) throw new Error("COUPON_COSMETIC_NOT_FOUND");
    const granted = await client.query(
      `insert into account_cosmetics (account_id, cosmetic_id, source)
       values ($1, $2, $3) on conflict do nothing`,
      [accountId, cosmeticId, source],
    );
    const converted = (granted.rowCount ?? 0) === 0;
    if (converted) {
      await client.query(
        `update economy_fragments set quantity = quantity + 1, updated_at = now()
         where account_id = $1 and rarity = $2`,
        [accountId, item.rarity],
      );
    }
    return {
      cosmeticId: item.id,
      cosmeticName: item.name_ko,
      rarity: item.rarity,
      converted,
    };
  }

  async redeemCoupon(accountId: string, code: string): Promise<CouponRedemptionResult> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const couponResult = await client.query<CouponRow>(
        `${couponSelect}
         where c.code = $1 and c.deleted_at is null
         for update of c`,
        [normalizeCode(code)],
      );
      const coupon = couponResult.rows[0];
      if (coupon === undefined) throw new Error("COUPON_NOT_FOUND");
      if (!coupon.active) throw new Error("COUPON_INACTIVE");
      const now = new Date();
      if (coupon.starts_at !== null && now < coupon.starts_at) throw new Error("COUPON_NOT_STARTED");
      if (coupon.expires_at !== null && now >= coupon.expires_at) throw new Error("COUPON_EXPIRED");
      const count = Number.parseInt(coupon.redemption_count, 10);
      if (coupon.max_redemptions !== null && count >= coupon.max_redemptions) {
        throw new Error("COUPON_LIMIT_REACHED");
      }
      await this.ensureEconomyRows(client, accountId);
      const redemptionId = randomUUID();
      const reserved = await client.query(
        `insert into coupon_redemptions (id, coupon_id, account_id, reward_result)
         values ($1, $2, $3, '[]'::jsonb)
         on conflict do nothing`,
        [redemptionId, coupon.id, accountId],
      );
      if ((reserved.rowCount ?? 0) === 0) throw new Error("COUPON_ALREADY_REDEEMED");

      const result: CouponRedemptionResult["rewards"] = [];
      for (const [rewardIndex, reward] of coupon.rewards.entries()) {
        if (reward.type === "color_chips") {
          const wallet = await client.query<{ color_chips: number }>(
            `update economy_wallets set color_chips = color_chips + $2,
               lifetime_earned = lifetime_earned + $2, updated_at = now()
             where account_id = $1 returning color_chips`,
            [accountId, reward.amount],
          );
          const balance = wallet.rows[0]?.color_chips;
          if (balance === undefined) throw new Error("ECONOMY_WALLET_NOT_FOUND");
          await client.query(
            `insert into economy_wallet_ledger (
               account_id, delta, reason, source_key, balance_after, metadata
             ) values ($1, $2, 'coupon', $3, $4, $5::jsonb)`,
            [
              accountId,
              reward.amount,
              `coupon:${coupon.id}:chips:${rewardIndex}`,
              balance,
              JSON.stringify({ couponCode: coupon.code }),
            ],
          );
          result.push({ type: reward.type, amount: reward.amount });
        } else if (reward.type === "palette_box_ticket") {
          await client.query(
            `update account_palette_box_tickets
             set quantity = quantity + $2, updated_at = now() where account_id = $1`,
            [accountId, reward.amount],
          );
          result.push({ type: reward.type, amount: reward.amount });
        } else if (reward.type === "fragments") {
          await client.query(
            `update economy_fragments set quantity = quantity + $3, updated_at = now()
             where account_id = $1 and rarity = $2`,
            [accountId, reward.rarity, reward.amount],
          );
          result.push({ type: reward.type, amount: reward.amount, rarity: reward.rarity });
        } else if (reward.type === "cosmetic") {
          const granted = await this.grantCosmetic(
            client,
            accountId,
            reward.cosmeticId,
            `coupon:${coupon.id}`,
          );
          result.push({
            type: reward.type,
            cosmeticId: granted.cosmeticId,
            cosmeticName: granted.cosmeticName,
            rarity: granted.rarity,
            convertedToFragment: granted.converted,
          });
        } else if (reward.type === "random_cosmetic") {
          const uniqueIds = [...new Set(reward.cosmeticIds)];
          const owned = await client.query<{ cosmetic_id: string }>(
            `select cosmetic_id from account_cosmetics
             where account_id = $1 and cosmetic_id = any($2::text[])`,
            [accountId, uniqueIds],
          );
          const ownedIds = new Set(owned.rows.map((row) => row.cosmetic_id));
          const selectedIds = selectRandomCosmeticCandidates(
            uniqueIds,
            ownedIds,
            reward.pickCount,
          );
          for (const cosmeticId of selectedIds) {
            const granted = await this.grantCosmetic(
              client,
              accountId,
              cosmeticId,
              `coupon:${coupon.id}:random`,
            );
            result.push({
              type: reward.type,
              cosmeticId: granted.cosmeticId,
              cosmeticName: granted.cosmeticName,
              rarity: granted.rarity,
              convertedToFragment: granted.converted,
            });
          }
        } else {
          await client.query(
            `insert into account_entitlements (
               account_id, entitlement, status, source_product_id
             ) values ($1, $2, 'active', $3)
             on conflict (account_id, entitlement) do update set
               status = 'active', source_product_id = excluded.source_product_id, updated_at = now()`,
            [accountId, reward.entitlement, `coupon:${coupon.id}`],
          );
          result.push({ type: reward.type, entitlement: reward.entitlement });
        }
      }
      await client.query(
        "update coupon_redemptions set reward_result = $2::jsonb where id = $1",
        [redemptionId, JSON.stringify(result)],
      );
      await client.query("commit");
      return {
        coupon: { id: coupon.id, code: coupon.code, name: coupon.name },
        rewards: result,
      };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async readUser(client: PoolClient, accountId: string): Promise<ManagedUser | null> {
    const result = await client.query<ManagedUserRow>(
      `select a.id, a.email, a.display_name, a.rating, a.games_played,
              a.ranked_wins, a.ranked_losses, a.ranked_draws,
              coalesce(w.color_chips, 0) as color_chips,
              coalesce(t.quantity, 0) as box_tickets,
              (select count(*)::text from account_cosmetics ac where ac.account_id = a.id) as cosmetic_count,
              a.suspended_at, a.suspension_reason, a.created_at
       from accounts a
       left join economy_wallets w on w.account_id = a.id
       left join account_palette_box_tickets t on t.account_id = a.id
       where a.id = $1`,
      [accountId],
    );
    return result.rows[0] ? toManagedUser(result.rows[0]) : null;
  }

  async listUsers(query: string, limit: number): Promise<ManagedUser[]> {
    const result = await this.pool.query<ManagedUserRow>(
      `select a.id, a.email, a.display_name, a.rating, a.games_played,
              a.ranked_wins, a.ranked_losses, a.ranked_draws,
              coalesce(w.color_chips, 0) as color_chips,
              coalesce(t.quantity, 0) as box_tickets,
              (select count(*)::text from account_cosmetics ac where ac.account_id = a.id) as cosmetic_count,
              a.suspended_at, a.suspension_reason, a.created_at
       from accounts a
       left join economy_wallets w on w.account_id = a.id
       left join account_palette_box_tickets t on t.account_id = a.id
       where $1 = '' or a.email ilike '%' || $1 || '%' or a.display_name ilike '%' || $1 || '%'
       order by a.created_at desc limit $2`,
      [query.trim(), limit],
    );
    return result.rows.map(toManagedUser);
  }

  async adjustUserChips(
    adminId: string,
    accountId: string,
    delta: number,
    reason: string,
  ): Promise<ManagedUser | null> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.ensureEconomyRows(client, accountId);
      const sourceKey = `admin:${randomUUID()}`;
      const wallet = await client.query<{ color_chips: number }>(
        `update economy_wallets set
           color_chips = color_chips + $2,
           lifetime_earned = lifetime_earned + greatest($2, 0),
           lifetime_spent = lifetime_spent + greatest(-$2, 0),
           updated_at = now()
         where account_id = $1 and color_chips + $2 >= 0
         returning color_chips`,
        [accountId, delta],
      );
      const balance = wallet.rows[0]?.color_chips;
      if (balance === undefined) throw new Error("ADMIN_CHIP_ADJUSTMENT_FAILED");
      await client.query(
        `insert into economy_wallet_ledger (
           account_id, delta, reason, source_key, balance_after, metadata
         ) values ($1, $2, 'admin_adjustment', $3, $4, $5::jsonb)`,
        [accountId, delta, sourceKey, balance, JSON.stringify({ reason, adminId })],
      );
      await this.audit(client, adminId, "user.chips.adjust", "account", accountId, { delta, reason });
      const user = await this.readUser(client, accountId);
      await client.query("commit");
      return user;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async grantUserCosmetic(
    adminId: string,
    accountId: string,
    cosmeticId: string,
    reason: string,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await client.query(
        `insert into account_cosmetics (account_id, cosmetic_id, source)
         select $1, id, 'admin' from cosmetic_catalog where id = $2 and active
         on conflict do nothing`,
        [accountId, cosmeticId],
      );
      await this.audit(client, adminId, "user.cosmetic.grant", "account", accountId, {
        cosmeticId,
        reason,
        granted: (result.rowCount ?? 0) > 0,
      });
      await client.query("commit");
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async grantUserCosmetics(
    adminId: string,
    accountId: string,
    selection: { cosmeticIds?: string[]; rarity?: CosmeticRarity },
    reason: string,
  ): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const ids = [...new Set(selection.cosmeticIds ?? [])];
      const result = selection.rarity
        ? await client.query(
            `insert into account_cosmetics (account_id, cosmetic_id, source)
             select $1, id, 'admin_batch'
             from cosmetic_catalog
             where active and category = 'tile_color' and rarity = $2
             on conflict do nothing`,
            [accountId, selection.rarity],
          )
        : await client.query(
            `insert into account_cosmetics (account_id, cosmetic_id, source)
             select $1, id, 'admin_batch'
             from cosmetic_catalog
             where active and category = 'tile_color' and id = any($2::text[])
             on conflict do nothing`,
            [accountId, ids],
          );
      const granted = result.rowCount ?? 0;
      await this.audit(client, adminId, "user.cosmetics.grant_batch", "account", accountId, {
        cosmeticIds: ids,
        rarity: selection.rarity ?? null,
        reason,
        granted,
      });
      await client.query("commit");
      return granted;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async setUserSuspension(
    adminId: string,
    accountId: string,
    suspended: boolean,
    reason: string,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await client.query(
        `update accounts set
           suspended_at = case when $2 then now() else null end,
           suspension_reason = case when $2 then $3 else null end,
           active_session_id = case when $2 then null else active_session_id end,
           updated_at = now()
         where id = $1`,
        [accountId, suspended, reason],
      );
      await this.audit(client, adminId, suspended ? "user.suspend" : "user.unsuspend", "account", accountId, {
        reason,
      });
      await client.query("commit");
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async listCatalog(): Promise<AdminCatalogItem[]> {
    const result = await this.pool.query<{
      id: string;
      name_ko: string;
      rarity: CosmeticRarity;
      visual_kind: AdminCatalogItem["visualKind"];
      visual_config: { colors?: unknown; pattern?: unknown; splitAngle?: unknown };
    }>(
      `select id, name_ko, rarity, visual_kind, visual_config from cosmetic_catalog
       where active order by rarity, name_ko`,
    );
    return result.rows.map((row) => ({
      id: row.id,
      nameKo: row.name_ko,
      rarity: row.rarity,
      visualKind: row.visual_kind,
      colors: Array.isArray(row.visual_config.colors)
        ? row.visual_config.colors.filter((value): value is string => typeof value === "string")
        : [],
      pattern: typeof row.visual_config.pattern === "string" ? row.visual_config.pattern : null,
      splitAngle: typeof row.visual_config.splitAngle === "number" ? row.visual_config.splitAngle : null,
    }));
  }

  async listAudit(limit: number): Promise<AdminAuditEntry[]> {
    const result = await this.pool.query<{
      id: string;
      admin_id: string | null;
      email: string | null;
      action: string;
      target_type: string;
      target_id: string | null;
      details: Record<string, unknown>;
      created_at: Date;
    }>(
      `select l.id::text, l.admin_id, a.email, l.action, l.target_type,
              l.target_id, l.details, l.created_at
       from admin_audit_logs l
       left join admin_accounts a on a.id = l.admin_id
       order by l.created_at desc limit $1`,
      [limit],
    );
    return result.rows.map((row) => ({
      id: row.id,
      adminId: row.admin_id,
      adminEmail: row.email,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      details: row.details,
      createdAt: row.created_at.toISOString(),
    }));
  }
}

export const createAdminStoreFromEnv = (): AdminStore => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString.trim() === "") return new NullAdminStore();
  const config: PoolConfig = { connectionString };
  if (process.env.DATABASE_SSL === "true") {
    config.ssl = { rejectUnauthorized: false };
  }
  return new PostgresAdminStore(config);
};

const tokenSign = (value: string, secret: string) =>
  createHmac("sha256", secret).update(value).digest("base64url");

export const createAdminToken = (
  adminId: string,
  sessionId: string,
  secret: string,
  ttlSeconds: number,
): string => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    sub: adminId,
    sid: sessionId,
    scope: "admin",
    exp: Math.floor(Date.now() / 1_000) + ttlSeconds,
  })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${tokenSign(unsigned, secret)}`;
};

export const verifyAdminToken = (
  token: string,
  secret: string,
): { adminId: string; sessionId: string } | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  if (header === undefined || payload === undefined || signature === undefined) return null;
  const unsigned = `${header}.${payload}`;
  const expected = Buffer.from(tokenSign(unsigned, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
      sid?: unknown;
      scope?: unknown;
      exp?: unknown;
    };
    if (
      typeof parsed.sub !== "string"
      || typeof parsed.sid !== "string"
      || parsed.scope !== "admin"
      || typeof parsed.exp !== "number"
      || parsed.exp <= Math.floor(Date.now() / 1_000)
    ) return null;
    return { adminId: parsed.sub, sessionId: parsed.sid };
  } catch {
    return null;
  }
};
