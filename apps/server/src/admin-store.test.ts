import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createAdminToken,
  selectRandomCosmeticCandidates,
  verifyAdminToken,
} from "./admin-store.js";

describe("admin and coupon policy", () => {
  it("keeps admin tokens separate and verifies their signature", () => {
    const token = createAdminToken("admin-1", "session-1", "a-secure-test-secret", 60);
    expect(verifyAdminToken(token, "a-secure-test-secret")).toEqual({
      adminId: "admin-1",
      sessionId: "session-1",
    });
    expect(verifyAdminToken(token, "another-secret")).toBeNull();
  });

  it("prefers unowned candidates for a custom random cosmetic reward", () => {
    const selected = selectRandomCosmeticCandidates(
      ["legendary-a", "legendary-b", "legendary-c"],
      new Set(["legendary-a", "legendary-b"]),
      2,
      () => 0,
    );
    expect(selected[0]).toBe("legendary-c");
    expect(selected).toHaveLength(2);
    expect(new Set(selected).size).toBe(2);
  });

  it("keeps coupon-owned data on account deletion cascade", () => {
    const migrationPath = fileURLToPath(new URL("../db/migrations/009_admin_coupons.sql", import.meta.url));
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toMatch(/coupon_redemptions[\s\S]*references accounts\(id\) on delete cascade/);
    expect(migration).toMatch(/account_palette_box_tickets[\s\S]*references accounts\(id\) on delete cascade/);
    expect(migration).toContain("unique (coupon_id, account_id)");
  });
});
