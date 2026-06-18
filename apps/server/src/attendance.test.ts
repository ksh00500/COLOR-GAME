import { describe, expect, it } from "vitest";
import { attendanceDateFor, nextAttendanceStreak, normalizeTimeZone, previousAttendanceDate } from "./attendance.js";

describe("attendance dates", () => {
  const instant = new Date("2026-06-18T00:30:00.000Z");

  it("uses the player's local calendar date", () => {
    expect(attendanceDateFor("Asia/Seoul", instant)).toBe("2026-06-18");
    expect(attendanceDateFor("America/Los_Angeles", instant)).toBe("2026-06-17");
  });

  it("falls back to UTC for missing or invalid time zones", () => {
    expect(normalizeTimeZone(undefined)).toBe("UTC");
    expect(normalizeTimeZone("Not/AZone")).toBe("UTC");
    expect(attendanceDateFor("Not/AZone", instant)).toBe("2026-06-18");
  });

  it("finds the previous calendar date across month and year boundaries", () => {
    expect(previousAttendanceDate("2026-03-01")).toBe("2026-02-28");
    expect(previousAttendanceDate("2026-01-01")).toBe("2025-12-31");
  });

  it("keeps duplicate check-ins, extends consecutive days, and resets gaps", () => {
    expect(nextAttendanceStreak("2026-06-18", "2026-06-18", 4)).toBe(4);
    expect(nextAttendanceStreak("2026-06-18", "2026-06-19", 4)).toBe(5);
    expect(nextAttendanceStreak("2026-06-17", "2026-06-19", 4)).toBe(1);
    expect(nextAttendanceStreak(null, "2026-06-19", 0)).toBe(1);
  });
});
