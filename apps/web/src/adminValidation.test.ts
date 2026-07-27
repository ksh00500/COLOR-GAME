import { describe, expect, it } from "vitest";
import type { CouponRecord } from "./api";
import {
  adminCouponCodePattern,
  validateAdminCoupon,
  validateChipAdjustment,
} from "./adminValidation";

type CouponDraft = Omit<CouponRecord, "id" | "redemptionCount" | "createdAt" | "updatedAt">;

const validCoupon = (): CouponDraft => ({
  code: "출시기념_2026",
  name: "출시 기념 쿠폰",
  description: "",
  rewards: [{ type: "color_chips", amount: 100 }],
  startsAt: null,
  expiresAt: null,
  maxRedemptions: null,
  active: true,
});

describe("admin input validation", () => {
  it("accepts Korean and Latin coupon codes without spaces", () => {
    expect(adminCouponCodePattern.test("출시기념_2026")).toBe(true);
    expect(adminCouponCodePattern.test("TANGO-WELCOME")).toBe(true);
    expect(validateAdminCoupon(validCoupon())).toBeNull();
  });

  it("rejects malformed coupon rewards before sending the request", () => {
    expect(validateAdminCoupon({
      ...validCoupon(),
      rewards: [{ type: "color_chips", amount: 0 }],
    })).toContain("컬러 칩");
    expect(validateAdminCoupon({
      ...validCoupon(),
      rewards: [{ type: "random_cosmetic", cosmeticIds: [], pickCount: 1 }],
    })).toContain("후보 스킨");
  });

  it("validates chip deltas and audit reasons using the server limits", () => {
    expect(validateChipAdjustment(100, "이벤트 지급")).toBeNull();
    expect(validateChipAdjustment(100, "칩")).toContain("작업 사유");
    expect(validateChipAdjustment(1.5, "이벤트 지급")).toContain("정수");
    expect(validateChipAdjustment(0, "이벤트 지급")).toContain("0이 아닌");
  });
});
