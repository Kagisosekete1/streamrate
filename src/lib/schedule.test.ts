import { describe, it, expect } from "vitest";
import { filterSchedule, parseInTimeZone, type ScheduleRowLite } from "./schedule";

const rows: ScheduleRowLite[] = [
  { id: "s1", user_id: "u1", title: "Apex grind", platform: "twitch", scheduled_at: "2099-01-01T00:00:00Z", profile: { username: "ninja_x", full_name: "Ninja" } },
  { id: "s2", user_id: "u2", title: "VALORANT ranked", platform: "youtube", scheduled_at: "2099-01-02T00:00:00Z", profile: { username: "shroud", full_name: "Mike" } },
  { id: "s3", user_id: "u3", title: "Chess speedrun", platform: "kick", scheduled_at: "2099-01-03T00:00:00Z", profile: { username: "magnus", full_name: "Magnus C." } },
  { id: "s4", user_id: "me", title: "My stream", platform: "twitch", scheduled_at: "2099-01-04T00:00:00Z", profile: { username: "me", full_name: "Me" } },
];

const base = {
  followingIds: new Set(["u2"]),
  reminderScheduleIds: new Set(["s3"]),
  currentUserId: "me",
};

describe("filterSchedule – platform filters", () => {
  it("returns all platforms when set to 'all'", () => {
    const out = filterSchedule(rows, { ...base, tab: "upcoming", platformFilter: "all", search: "" });
    expect(out).toHaveLength(4);
  });
  it("filters by twitch only", () => {
    const out = filterSchedule(rows, { ...base, tab: "upcoming", platformFilter: "twitch", search: "" });
    expect(out.map((r) => r.id)).toEqual(["s1", "s4"]);
  });
  it("filters by youtube only", () => {
    const out = filterSchedule(rows, { ...base, tab: "upcoming", platformFilter: "youtube", search: "" });
    expect(out.map((r) => r.id)).toEqual(["s2"]);
  });
});

describe("filterSchedule – tab toggles", () => {
  it("'mine' shows only the current user's streams", () => {
    const out = filterSchedule(rows, { ...base, tab: "mine", platformFilter: "all", search: "" });
    expect(out.map((r) => r.id)).toEqual(["s4"]);
  });
  it("'following' shows only followed streamers", () => {
    const out = filterSchedule(rows, { ...base, tab: "following", platformFilter: "all", search: "" });
    expect(out.map((r) => r.id)).toEqual(["s2"]);
  });
  it("'reminders' shows only scheduled streams with a reminder", () => {
    const out = filterSchedule(rows, { ...base, tab: "reminders", platformFilter: "all", search: "" });
    expect(out.map((r) => r.id)).toEqual(["s3"]);
  });
});

describe("filterSchedule – username search (case-insensitive, no whitelist)", () => {
  it("finds users by exact lowercase username", () => {
    const out = filterSchedule(rows, { ...base, tab: "upcoming", platformFilter: "all", search: "shroud" });
    expect(out.map((r) => r.id)).toEqual(["s2"]);
  });
  it("finds users when query is upper-case", () => {
    const out = filterSchedule(rows, { ...base, tab: "upcoming", platformFilter: "all", search: "SHROUD" });
    expect(out.map((r) => r.id)).toEqual(["s2"]);
  });
  it("finds users by partial username", () => {
    const out = filterSchedule(rows, { ...base, tab: "upcoming", platformFilter: "all", search: "ninj" });
    expect(out.map((r) => r.id)).toEqual(["s1"]);
  });
  it("uses server-matched user IDs even when profile is missing locally", () => {
    const rowsMissingProfile: ScheduleRowLite[] = [
      { id: "x1", user_id: "uHidden", title: "Untitled", platform: "twitch", scheduled_at: "2099-01-05T00:00:00Z", profile: null },
    ];
    const out = filterSchedule(rowsMissingProfile, {
      ...base, tab: "upcoming", platformFilter: "all",
      search: "kagiso", matchedUserIds: new Set(["uHidden"]),
    });
    expect(out.map((r) => r.id)).toEqual(["x1"]);
  });
});

describe("parseInTimeZone – timezone conversion", () => {
  it("converts a wall-clock time in UTC to the same UTC instant", () => {
    const d = parseInTimeZone("2030-06-15T12:00", "UTC");
    expect(d.toISOString()).toBe("2030-06-15T12:00:00.000Z");
  });
  it("converts a wall-clock time in Africa/Johannesburg (UTC+2) to UTC", () => {
    const d = parseInTimeZone("2030-06-15T12:00", "Africa/Johannesburg");
    expect(d.toISOString()).toBe("2030-06-15T10:00:00.000Z");
  });
  it("converts a wall-clock time in America/New_York (DST = UTC-4 in June) to UTC", () => {
    const d = parseInTimeZone("2030-06-15T12:00", "America/New_York");
    expect(d.toISOString()).toBe("2030-06-15T16:00:00.000Z");
  });
  it("converts a wall-clock time in Asia/Tokyo (UTC+9, no DST) to UTC", () => {
    const d = parseInTimeZone("2030-06-15T12:00", "Asia/Tokyo");
    expect(d.toISOString()).toBe("2030-06-15T03:00:00.000Z");
  });
});