import { formatDistanceToNow } from "date-fns";

type RelativeTimeOptions = { addSuffix?: boolean };

/** Format legacy or user supplied timestamps without allowing one bad value to crash a route. */
export function formatRelativeTimeSafe(
  value: string | number | Date | null | undefined,
  options: RelativeTimeOptions = {},
): string {
  const date = value instanceof Date ? value : value == null || value === "" ? null : new Date(value);
  if (!date || !Number.isFinite(date.getTime())) {
    return "Date unavailable";
  }

  // Old rows can contain epoch-based, timezone-less, or otherwise corrupt dates.
  // Do not present a believable but incorrect age (for example, "57 years ago").
  const currentYear = new Date().getFullYear();
  const timestampYear = date.getFullYear();
  const maxAgeMs = 25 * 366 * 24 * 60 * 60 * 1000;
  if (timestampYear < 2000 || timestampYear > currentYear + 1 || Math.abs(Date.now() - date.getTime()) > maxAgeMs) {
    return "Date unavailable";
  }

  try {
    return formatDistanceToNow(date, options);
  } catch {
    return "Date unavailable";
  }
}

