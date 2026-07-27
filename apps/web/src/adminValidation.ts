import { ApiError, type CouponRecord, type CouponReward } from "./api";

type CouponDraft = Omit<CouponRecord, "id" | "redemptionCount" | "createdAt" | "updatedAt">;

export const adminCouponCodePattern = /^[\p{L}\p{N}_-]+$/u;

const validInteger = (value: number, minimum: number, maximum: number) =>
  Number.isInteger(value) && value >= minimum && value <= maximum;

const rewardError = (reward: CouponReward): string | null => {
  if (reward.type === "color_chips") {
    return validInteger(reward.amount, 1, 1_000_000)
      ? null
      : "컬러 칩 수량은 1~1,000,000 사이의 정수여야 합니다.";
  }
  if (reward.type === "palette_box_ticket") {
    return validInteger(reward.amount, 1, 1_000)
      ? null
      : "상자 이용권 수량은 1~1,000 사이의 정수여야 합니다.";
  }
  if (reward.type === "fragments") {
    return validInteger(reward.amount, 1, 10_000)
      ? null
      : "파편 수량은 1~10,000 사이의 정수여야 합니다.";
  }
  if (reward.type === "cosmetic") {
    return reward.cosmeticId.trim().length > 0
      ? null
      : "지급할 스킨을 선택해 주세요.";
  }
  if (reward.type === "random_cosmetic") {
    const uniqueIds = new Set(reward.cosmeticIds);
    if (uniqueIds.size === 0) return "커스텀 랜덤 보상의 후보 스킨을 선택해 주세요.";
    if (uniqueIds.size !== reward.cosmeticIds.length) {
      return "커스텀 랜덤 보상에 같은 스킨이 중복되어 있습니다.";
    }
    return validInteger(reward.pickCount, 1, Math.min(20, uniqueIds.size))
      ? null
      : "랜덤 지급 개수는 선택한 후보 수보다 많을 수 없습니다.";
  }
  return null;
};

export const validateAdminCoupon = (draft: CouponDraft): string | null => {
  const code = draft.code.trim();
  if (code.length < 3 || code.length > 40) {
    return "쿠폰 코드는 3~40자로 입력해 주세요.";
  }
  if (!adminCouponCodePattern.test(code)) {
    return "쿠폰 코드는 문자, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있습니다.";
  }
  if (draft.name.trim().length < 1 || draft.name.trim().length > 80) {
    return "쿠폰 표시 이름은 1~80자로 입력해 주세요.";
  }
  if (draft.description.trim().length > 500) {
    return "쿠폰 설명은 500자 이하로 입력해 주세요.";
  }
  if (draft.rewards.length < 1 || draft.rewards.length > 20) {
    return "쿠폰 보상은 1~20개로 구성해 주세요.";
  }
  for (const reward of draft.rewards) {
    const error = rewardError(reward);
    if (error !== null) return error;
  }
  if (
    draft.maxRedemptions !== null
    && !validInteger(draft.maxRedemptions, 1, 10_000_000)
  ) {
    return "전체 수령 한도는 1~10,000,000 사이의 정수여야 합니다.";
  }
  const startsAt = draft.startsAt === null ? null : new Date(draft.startsAt);
  const expiresAt = draft.expiresAt === null ? null : new Date(draft.expiresAt);
  if (startsAt !== null && Number.isNaN(startsAt.getTime())) {
    return "쿠폰 시작 시각을 다시 확인해 주세요.";
  }
  if (expiresAt !== null && Number.isNaN(expiresAt.getTime())) {
    return "쿠폰 만료 시각을 다시 확인해 주세요.";
  }
  if (startsAt !== null && expiresAt !== null && expiresAt <= startsAt) {
    return "만료 시각은 시작 시각보다 늦어야 합니다.";
  }
  return null;
};

export const validateChipAdjustment = (delta: number, reason: string): string | null => {
  if (!validInteger(delta, -1_000_000, 1_000_000) || delta === 0) {
    return "칩 증감량은 0이 아닌 -1,000,000~1,000,000 사이의 정수여야 합니다.";
  }
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 2 || normalizedReason.length > 200) {
    return "작업 사유는 2~200자로 입력해 주세요.";
  }
  return null;
};

const fieldLabels: Record<string, string> = {
  code: "쿠폰 코드",
  name: "표시 이름",
  description: "설명",
  rewards: "보상 구성",
  startsAt: "시작 시각",
  expiresAt: "만료 시각",
  maxRedemptions: "전체 수령 한도",
  delta: "칩 증감량",
  reason: "작업 사유",
};

const validationFieldFromDetails = (details: unknown): string | null => {
  if (details === null || typeof details !== "object") return null;
  const root = details as Record<string, unknown>;
  const nested = root.details;
  if (nested !== undefined) return validationFieldFromDetails(nested);
  for (const value of Object.values(root)) {
    if (value === null || typeof value !== "object") continue;
    const object = value as Record<string, unknown>;
    const fieldErrors = object.fieldErrors;
    if (fieldErrors !== null && typeof fieldErrors === "object") {
      const field = Object.keys(fieldErrors as Record<string, unknown>)[0];
      if (field !== undefined) return fieldLabels[field] ?? field;
    }
    const nestedField = validationFieldFromDetails(value);
    if (nestedField !== null) return nestedField;
  }
  return null;
};

export const adminErrorMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "INVALID_REQUEST") {
    const field = validationFieldFromDetails(error.details);
    return field === null
      ? "입력값을 다시 확인해 주세요."
      : `${field} 입력값을 다시 확인해 주세요.`;
  }
  const messages: Record<string, string> = {
    COUPON_CODE_EXISTS: "이미 사용 중인 쿠폰 코드입니다.",
    COUPON_UPDATE_CONFLICT: "쿠폰을 수정하지 못했습니다. 코드 중복 여부를 확인해 주세요.",
    ADMIN_CHIP_ADJUSTMENT_FAILED: "칩 잔액을 변경하지 못했습니다. 차감 후 잔액이 0보다 작아질 수 없습니다.",
    PROFILE_NOT_FOUND: "선택한 계정을 찾을 수 없습니다.",
    UNAUTHORIZED: "관리자 세션이 만료되었습니다. 다시 로그인해 주세요.",
    RATE_LIMITED: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  };
  return messages[error.code] ?? error.message ?? fallback;
};
