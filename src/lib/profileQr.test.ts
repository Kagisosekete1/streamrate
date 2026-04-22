import { describe, expect, it } from "vitest";
import { buildProfileQrUrl, isValidQrHandle, sanitizeQrHandle } from "./profileQr";

describe("profile QR links", () => {
  it("builds the signed StreamRate profile URL from a stable QR handle", () => {
    expect(buildProfileQrUrl("streamer_one")).toBe("https://streamrateapp.com/u/streamer_one");
  });

  it("sanitizes display names into QR-safe handles", () => {
    expect(sanitizeQrHandle("Streamer One!!")).toBe("streamer_one");
  });

  it("validates globally unique handle format before lookup", () => {
    expect(isValidQrHandle("streamer_123")).toBe(true);
    expect(isValidQrHandle("1streamer")).toBe(false);
    expect(isValidQrHandle("ab")).toBe(false);
  });
});