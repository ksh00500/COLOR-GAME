import { describe, expect, it } from "vitest";
import { hasTranslation } from "./i18n";

describe("localization catalog", () => {
  it.each([
    "Tango 초대",
    "Tango 관전",
    "Tango 리플레이",
    "처음부터 재생",
    "재생 속도",
    "득점 연결",
    "초대 링크로 대전에 참가하세요.",
    "진행 중인 대전을 함께 보세요.",
    "현재 수의 공유 링크를 복사했습니다.",
    "관전 서버에 연결하지 못했습니다.",
    "온라인 대전 정보",
    "REPLAY_NOT_FOUND",
    "TURN_TIME_EXPIRED",
  ])("contains every critical user-facing translation: %s", (key) => {
    expect(hasTranslation(key)).toBe(true);
  });
});
