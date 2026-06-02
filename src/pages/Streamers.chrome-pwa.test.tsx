import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Streamers from "./Streamers";
import { applyChromePwaRenderingGuards } from "@/lib/chromePwaRenderingGuard";

vi.mock("@/components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/StreamerCard", () => ({
  StreamerCard: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock("@/components/TrendingStreamersSection", () => ({
  TrendingStreamersSection: () => <div data-testid="trending-streamers" />,
}));

const emptyQuery = {
  select: vi.fn(() => emptyQuery),
  eq: vi.fn(() => emptyQuery),
  in: vi.fn(() => Promise.resolve({ data: [] })),
  gte: vi.fn(() => emptyQuery),
  order: vi.fn(() => emptyQuery),
  limit: vi.fn(() => Promise.resolve({ data: [] })),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => emptyQuery),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  document.documentElement.className = "";
  document.body.className = "";
});

describe("Discover Chrome Android PWA stability", () => {
  it("hard reloads and scrolls without re-enabling blur glitches", async () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36"
    );

    applyChromePwaRenderingGuards();
    const firstLoad = render(<MemoryRouter initialEntries={["/streamers"]}><Streamers /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Discover")).toBeInTheDocument());
    window.dispatchEvent(new Event("scroll"));

    firstLoad.unmount();

    applyChromePwaRenderingGuards();
    render(<MemoryRouter initialEntries={["/streamers"]}><Streamers /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Discover")).toBeInTheDocument());
    window.dispatchEvent(new Event("scroll"));

    expect(document.documentElement).toHaveClass("chrome-android-pwa");
    expect(document.documentElement).toHaveClass("no-backdrop-blur");
  });
});