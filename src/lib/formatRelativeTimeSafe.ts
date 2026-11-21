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

  try {
    return formatDistanceToNow(date, options);
  } catch {
    return "Date unavailable";
  }
}

