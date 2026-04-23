import { beforeEach, describe, expect, it, vi } from "vitest";

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  },
});

const profiles = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    username: "old_streamer",
    qr_handle: "current_streamer",
    signup_number: 42,
  },
];

const aliases = [
  { alias: "legacy_streamer", profile_id: "11111111-1111-4111-8111-111111111111" },
  { alias: "11111111-1111-4111-8111-111111111111", profile_id: "11111111-1111-4111-8111-111111111111" },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: (column: string, value: string | number) => ({
          maybeSingle: async () => {
            if (table === "profiles") {
              return { data: profiles.find((profile) => (profile as any)[column] === value) || null };
            }
            if (table === "profile_qr_aliases") {
              return { data: aliases.find((alias) => (alias as any)[column] === value) || null };
            }
            return { data: null };
          },
        }),
      }),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

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

  it("deep-links legacy QR usernames to the current signed StreamRate profile", async () => {
    const { resolveProfileRouteParam } = await import("./profileQr");
    const resolved = await resolveProfileRouteParam("legacy_streamer");

    expect(resolved).toEqual({
      profileId: "11111111-1111-4111-8111-111111111111",
      qrHandle: "current_streamer",
    });
  });

  it("deep-links https://streamrateapp.com/u/{username} params to the canonical QR handle", async () => {
    const { resolveProfileRouteParam, buildProfileQrUrl } = await import("./profileQr");
    const freshLoadParam = new URL(buildProfileQrUrl("old_streamer")).pathname.split("/").pop();
    const resolved = await resolveProfileRouteParam(freshLoadParam);

    expect(buildProfileQrUrl(resolved!.qrHandle)).toBe("https://streamrateapp.com/u/current_streamer");
  });
});