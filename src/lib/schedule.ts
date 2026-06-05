import type { StreamPlatform } from "@/lib/streamLinks";

export interface ScheduleRowLite {
  id: string;
  user_id: string;
  title: string;
  platform: StreamPlatform;
  scheduled_at: string;
  profile?: { username: string | null; full_name: string | null } | null;
}

export interface FilterOpts {
  tab: "upcoming" | "following" | "mine" | "reminders";
  currentUserId?: string;
  followingIds: Set<string>;
  reminderScheduleIds: Set<string>;
  platformFilter: "all" | StreamPlatform;
  search: string;
  matchedUserIds?: Set<string>;
}

export function filterSchedule(rows: ScheduleRowLite[], opts: FilterOpts): ScheduleRowLite[] {
  let list = rows;
  if (opts.tab === "mine") list = list.filter((r) => r.user_id === opts.currentUserId);
  else if (opts.tab === "following") list = list.filter((r) => opts.followingIds.has(r.user_id));
  else if (opts.tab === "reminders") list = list.filter((r) => opts.reminderScheduleIds.has(r.id));

  if (opts.platformFilter !== "all") list = list.filter((r) => r.platform === opts.platformFilter);

  const q = opts.search.trim().toLowerCase();
  if (q) {
    list = list.filter((r) => {
      const u = (r.profile?.username || "").toLowerCase();
      const n = (r.profile?.full_name || "").toLowerCase();
      const t = (r.title || "").toLowerCase();
      return u.includes(q) || n.includes(q) || t.includes(q) || (opts.matchedUserIds?.has(r.user_id) ?? false);
    });
  }
  return list;
}

// Convert a "YYYY-MM-DDTHH:mm" wall-clock string in tz to a real Date (UTC instant).
export function parseInTimeZone(local: string, tz: string): Date {
  try {
    const naive = new Date(local);
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = dtf.formatToParts(naive).reduce<Record<string, string>>((a, p) => { a[p.type] = p.value; return a; }, {});
    const asTz = Date.UTC(
      parseInt(parts.year, 10), parseInt(parts.month, 10) - 1, parseInt(parts.day, 10),
      parseInt(parts.hour, 10), parseInt(parts.minute, 10), parseInt(parts.second, 10),
    );
    const offset = asTz - naive.getTime();
    return new Date(naive.getTime() - offset);
  } catch {
    return new Date(local);
  }
}