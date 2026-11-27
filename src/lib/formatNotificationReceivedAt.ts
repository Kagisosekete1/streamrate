import { format } from "date-fns";

/** Show the stored notification receipt timestamp as a local calendar date and time. */
export function formatNotificationReceivedAt(value: string | number | Date | null | undefined): string {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    // Support Unix timestamps from older clients (seconds) and standard JS timestamps (ms).
    date = new Date(Math.abs(value) < 100_000_000_000 ? value * 1000 : value);
  } else if (typeof value === "string" && value.trim() !== "") {
    const raw = value.trim();
    if (/^-?\d{9,13}$/.test(raw)) {
      const numeric = Number(raw);
      date = new Date(Math.abs(numeric) < 100_000_000_000 ? numeric * 1000 : numeric);
    } else {
      date = new Date(raw);
    }
  } else {
    return "Date unavailable";
  }

  const timestamp = date.getTime();
  const oldestSupported = new Date("2000-01-01T00:00:00.000Z").getTime();
  if (!Number.isFinite(timestamp) || timestamp < oldestSupported || timestamp > Date.now() + 24 * 60 * 60 * 1000) {
    return "Date unavailable";
  }

  return format(date, "d MMM yyyy, HH:mm");
}
