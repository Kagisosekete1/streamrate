import { describe, expect, it } from "vitest";
import { formatRelativeTimeSafe } from "./formatRelativeTimeSafe";

describe("formatRelativeTimeSafe", () => {
  it("does not show decades-old ages for malformed legacy timestamps", () => {
    expect(formatRelativeTimeSafe("1969-12-31T00:00:00.000Z", { addSuffix: true })).toBe("Date unavailable");
  });

  it("formats a valid recent timestamp relatively", () => {
    const recent = new Date(Date.now() - 60_000);
    expect(formatRelativeTimeSafe(recent, { addSuffix: true })).toMatch(/minute ago/);
  });

  it("handles invalid values safely", () => {
    expect(formatRelativeTimeSafe("not-a-date")).toBe("Date unavailable");
  });
});
