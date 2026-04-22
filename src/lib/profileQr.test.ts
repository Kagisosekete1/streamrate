import { describe, expect, it } from "vitest";

describe("profile QR links", () => {
  it("builds the signed StreamRate profile URL from a stable QR handle", async () => {
    const { buildProfileQrUrl } = await import("./profileQr");
    expect(buildProfileQrUrl("streamer_one")).toBe("https://streamrateapp.com/u/streamer_one");
  });

  it("sanitizes display names into QR-safe handles", async () => {
    const { sanitizeQrHandle } = await import("./profileQr");
    expect(sanitizeQrHandle("Streamer One!!")).toBe("streamer_one");
  });

  it("validates globally unique handle format before lookup", async () => {
    const { isValidQrHandle } = await import("./profileQr");
    expect(isValidQrHandle("streamer_123")).toBe(true);
    expect(isValidQrHandle("1streamer")).toBe(false);
    expect(isValidQrHandle("ab")).toBe(false);
  });
});