const fallbackTimeZone = "UTC";

export const normalizeTimeZone = (timeZone: string | undefined): string => {
  if (timeZone === undefined || timeZone.trim() === "") return fallbackTimeZone;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
    return timeZone;
  } catch {
    return fallbackTimeZone;
  }
};

export const attendanceDateFor = (
  timeZone: string | undefined,
  now = new Date(),
): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const previousAttendanceDate = (date: string): string => {
  const previous = new Date(`${date}T00:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
};

export const nextAttendanceStreak = (
  lastAttendanceDate: string | null,
  attendedOn: string,
  currentStreak: number,
): number => {
  if (lastAttendanceDate === attendedOn) return currentStreak;
  return lastAttendanceDate === previousAttendanceDate(attendedOn)
    ? currentStreak + 1
    : 1;
};
