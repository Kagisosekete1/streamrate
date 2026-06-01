import { describe, it, expect, vi } from "vitest";

// Mock supabase + hooks so the module can be imported in a test env
// without pulling in real network / context.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
    }),
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useGamification", () => ({
  useGamification: () => ({ updateMissionProgress: () => {} }),
}));

describe("WatchParties module", () => {
  it("exports a component without runtime errors at import time", async () => {
    const mod = await import("./WatchParties");
    expect(typeof mod.default).toBe("function");
  });
});