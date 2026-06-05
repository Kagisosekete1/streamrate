import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Plus,
  Bell,
  BellOff,
  ExternalLink,
  Trash2,
  Loader2,
  Twitch,
  Youtube,
  Radio,
  Search,
  Settings2,
  Globe,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateStreamUrl, type StreamPlatform } from "@/lib/streamLinks";
import { cn } from "@/lib/utils";

interface ScheduleRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  platform: StreamPlatform;
  stream_url: string | null;
  scheduled_at: string;
  timezone?: string | null;
  profile?: {
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
}

interface ReminderRow {
  id: string;
  schedule_id: string;
  lead_minutes: number;
}

const LEAD_OPTIONS = [
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 180, label: "3 hours before" },
  { value: 1440, label: "1 day before" },
];

const localTz = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
};

const PLATFORM_META: Record<
  StreamPlatform,
  { label: string; Icon: React.ElementType; color: string }
> = {
  twitch: { label: "Twitch", Icon: Twitch, color: "text-purple-500" },
  kick: { label: "Kick", Icon: Radio, color: "text-green-500" },
  youtube: { label: "YouTube", Icon: Youtube, color: "text-red-500" },
  custom: { label: "Other", Icon: ExternalLink, color: "text-muted-foreground" },
};

const formatWhen = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < -5) return "Started";
  if (diffMin < 60 && diffMin >= -5) return diffMin <= 0 ? "Live now" : `In ${diffMin}m`;
  const sameDay = date.toDateString() === now.toDateString();
  const opts: Intl.DateTimeFormatOptions = sameDay
    ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" }
    : { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" };
  return date.toLocaleString(undefined, opts);
};

// Convert a "YYYY-MM-DDTHH:mm" wall-clock string in tz to a real Date (UTC instant).
function parseInTimeZone(local: string, tz: string): Date {
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

const StreamSchedule = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "following" | "mine" | "reminders">("upcoming");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | StreamPlatform>("all");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [defaultLead, setDefaultLead] = useState<number>(15);
  const [matchedUserIds, setMatchedUserIds] = useState<Set<string>>(new Set());

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<StreamPlatform>("twitch");
  const [streamUrl, setStreamUrl] = useState("");
  const [whenLocal, setWhenLocal] = useState("");
  const [tz, setTz] = useState<string>(localTz());
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const nowIso = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data, error } = await (supabase as any)
      .from("stream_schedules")
      .select("id, user_id, title, description, platform, stream_url, scheduled_at, timezone")
      .gte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(100);

    if (error) {
      toast({ title: "Couldn't load schedule", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const list = (data || []) as ScheduleRow[];
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .in("id", ids);
      const map = new Map((profiles || []).map((p) => [p.id, p]));
      list.forEach((r) => {
        r.profile = (map.get(r.user_id) as any) || null;
      });
    }
    setRows(list);

    if (user) {
      const { data: rem } = await (supabase as any)
        .from("stream_schedule_reminders")
        .select("id, schedule_id, lead_minutes")
        .eq("user_id", user.id);
      setReminders(((rem || []) as any[]) as ReminderRow[]);

      const { data: fol } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      setFollowingIds(new Set(((fol || []) as any[]).map((f) => f.following_id)));
    }
    setLoading(false);
  };

  // Hardened, case-insensitive username search against profiles (no whitelist).
  useEffect(() => {
    const q = search.trim();
    if (!q) { setMatchedUserIds(new Set()); return; }
    let cancelled = false;
    const run = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(50);
      if (cancelled) return;
      setMatchedUserIds(new Set(((data || []) as any[]).map((p) => p.id)));
    };
    const t = setTimeout(run, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const reminderMap = useMemo(() => {
    const m = new Map<string, ReminderRow>();
    reminders.forEach((r) => m.set(r.schedule_id, r));
    return m;
  }, [reminders]);

  const visibleRows = useMemo(() => {
    let list = rows;
    if (tab === "mine") list = list.filter((r) => r.user_id === user?.id);
    else if (tab === "following") list = list.filter((r) => followingIds.has(r.user_id));
    else if (tab === "reminders") list = list.filter((r) => reminderMap.has(r.id));

    if (platformFilter !== "all") list = list.filter((r) => r.platform === platformFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const u = (r.profile?.username || "").toLowerCase();
        const n = (r.profile?.full_name || "").toLowerCase();
        const t = (r.title || "").toLowerCase();
        return u.includes(q) || n.includes(q) || t.includes(q) || matchedUserIds.has(r.user_id);
      });
    }
    return list;
  }, [rows, tab, user?.id, platformFilter, search, followingIds, reminderMap, matchedUserIds]);

  const handleCreate = async () => {
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Add a title for your stream", variant: "destructive" });
      return;
    }
    if (!whenLocal) {
      toast({ title: "Pick a date and time", variant: "destructive" });
      return;
    }
    const when = parseInTimeZone(whenLocal, tz);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 5 * 60 * 1000) {
      toast({ title: "Pick a future date/time", variant: "destructive" });
      return;
    }

    let normalizedUrl: string | null = null;
    if (streamUrl.trim()) {
      const res = validateStreamUrl(platform, streamUrl);
      if (!res.ok) {
        const msg = "error" in res ? res.error : "Invalid URL";
        toast({ title: "Invalid stream URL", description: msg, variant: "destructive" });
        return;
      }
      normalizedUrl = res.url;
    }

    setSaving(true);
    const { error } = await (supabase as any).from("stream_schedules").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      platform,
      stream_url: normalizedUrl,
      scheduled_at: when.toISOString(),
      timezone: tz,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Stream scheduled", description: "Fans can now set reminders." });
    setTitle("");
    setDescription("");
    setStreamUrl("");
    setWhenLocal("");
    setCreateOpen(false);
    fetchAll();
  };

  const toggleReminder = async (row: ScheduleRow) => {
    if (!user) {
      toast({ title: "Sign in to set a reminder", variant: "destructive" });
      return;
    }
    const existing = reminderMap.get(row.id);
    if (existing) {
      const { error } = await (supabase as any)
        .from("stream_schedule_reminders")
        .delete()
        .eq("schedule_id", row.id)
        .eq("user_id", user.id);
      if (error) {
        toast({ title: "Couldn't remove reminder", description: error.message, variant: "destructive" });
        return;
      }
      setReminders((prev) => prev.filter((r) => r.schedule_id !== row.id));
      toast({ title: "Reminder removed" });
    } else {
      const { data: inserted, error } = await (supabase as any)
        .from("stream_schedule_reminders")
        .insert({ schedule_id: row.id, user_id: user.id, lead_minutes: defaultLead })
        .select("id, schedule_id, lead_minutes")
        .single();
      if (error) {
        toast({ title: "Couldn't set reminder", description: error.message, variant: "destructive" });
        return;
      }
      if (inserted) setReminders((prev) => [...prev, inserted as ReminderRow]);
      try {
        if ("Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission();
        }
      } catch { /* ignore */ }
      toast({ title: "You'll be reminded", description: `${defaultLead}m before • ${formatWhen(row.scheduled_at)}` });
    }
  };

  const updateReminderLead = async (reminderId: string, lead: number) => {
    const { error } = await (supabase as any)
      .from("stream_schedule_reminders")
      .update({ lead_minutes: lead })
      .eq("id", reminderId);
    if (error) {
      toast({ title: "Couldn't update reminder", description: error.message, variant: "destructive" });
      return;
    }
    setReminders((prev) => prev.map((r) => (r.id === reminderId ? { ...r, lead_minutes: lead } : r)));
    toast({ title: "Reminder updated" });
  };

  const handleDelete = async (row: ScheduleRow) => {
    if (!user || row.user_id !== user.id) return;
    if (!confirm(`Delete "${row.title}"?`)) return;
    const { error } = await (supabase as any)
      .from("stream_schedules")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast({ title: "Scheduled stream removed" });
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              <h1 className="font-bold text-lg text-foreground">Stream Schedule</h1>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" /> Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule a stream</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="ss-title">Title</Label>
                    <Input
                      id="ss-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ranked grind, viewer games, etc."
                      maxLength={120}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Platform</Label>
                      <Select value={platform} onValueChange={(v) => setPlatform(v as StreamPlatform)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="twitch">Twitch</SelectItem>
                          <SelectItem value="kick">Kick</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="custom">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="ss-when">When</Label>
                      <Input
                        id="ss-when"
                        type="datetime-local"
                        value={whenLocal}
                        onChange={(e) => setWhenLocal(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ss-tz">Your timezone</Label>
                    <Input
                      id="ss-tz"
                      value={tz}
                      onChange={(e) => setTz(e.target.value)}
                      placeholder="e.g. Africa/Johannesburg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Fans will see this time converted to their own timezone.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ss-url">Stream link (optional)</Label>
                    <Input
                      id="ss-url"
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      placeholder="twitch.tv/yourname"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ss-desc">Notes (optional)</Label>
                    <Textarea
                      id="ss-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What you're playing, who's joining..."
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    Schedule it
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="max-w-2xl mx-auto px-4 pb-2 space-y-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {([
                { id: "upcoming", label: "All", Icon: Globe },
                { id: "following", label: "Following", Icon: Users },
                { id: "reminders", label: "My reminders", Icon: Bell },
                { id: "mine", label: "My schedule", Icon: CalendarClock },
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition inline-flex items-center gap-1",
                    tab === id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search streamer username or title…"
                  className="pl-8 h-9"
                />
              </div>
              <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as any)}>
                <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  <SelectItem value="twitch">Twitch</SelectItem>
                  <SelectItem value="kick">Kick</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="custom">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Settings2 className="w-3.5 h-3.5" />
              <span>Default reminder:</span>
              <Select value={String(defaultLead)} onValueChange={(v) => setDefaultLead(parseInt(v, 10))}>
                <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="ml-auto">Your tz: {localTz()}</span>
              <Link to="/reminders" className="text-primary hover:underline ml-2">Manage</Link>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <CalendarClock className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-foreground font-medium">
                {tab === "mine"
                  ? "You haven't scheduled any streams"
                  : tab === "following"
                  ? "None of the streamers you follow have streams scheduled"
                  : tab === "reminders"
                  ? "No reminders set yet"
                  : "Nothing scheduled yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                Tap <span className="font-semibold">Schedule</span> to announce your next stream.
              </p>
            </div>
          ) : (
            visibleRows.map((row, i) => {
              const meta = PLATFORM_META[row.platform] || PLATFORM_META.custom;
              const Icon = meta.Icon;
              const isOwner = user?.id === row.user_id;
              const existing = reminderMap.get(row.id);
              const hasReminder = !!existing;
              const showStreamerTz = row.timezone && row.timezone !== localTz();
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <Link to={`/u/${row.user_id}`} className="shrink-0">
                      <img
                        src={
                          row.profile?.avatar_url ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face"
                        }
                        alt={row.profile?.username || "Streamer"}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-border"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                        <span>{meta.label}</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">{formatWhen(row.scheduled_at)}</span>
                      </div>
                      <h3 className="text-foreground font-semibold truncate">{row.title}</h3>
                      <Link
                        to={`/u/${row.user_id}`}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        @{row.profile?.username || "streamer"}
                      </Link>
                      {showStreamerTz && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Streamer's time: {new Date(row.scheduled_at).toLocaleString(undefined, {
                            timeZone: row.timezone!,
                            hour: "numeric", minute: "2-digit", weekday: "short", month: "short", day: "numeric",
                          })} ({row.timezone})
                        </p>
                      )}
                      {row.description && (
                        <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">
                          {row.description}
                        </p>
                      )}
                      {hasReminder && existing && (() => {
                        const fireAt = new Date(
                          new Date(row.scheduled_at).getTime() - existing.lead_minutes * 60_000,
                        );
                        const past = fireAt.getTime() < Date.now();
                        return (
                          <p className={cn(
                            "text-[11px] mt-1 inline-flex items-center gap-1",
                            past ? "text-amber-500" : "text-primary",
                          )}>
                            <Bell className="w-3 h-3" />
                            {past
                              ? "Reminder sending shortly…"
                              : `Reminder fires ${fireAt.toLocaleString(undefined, {
                                  weekday: "short", month: "short", day: "numeric",
                                  hour: "numeric", minute: "2-digit",
                                })} (your time)`}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                    <div className="flex items-center gap-2">
                      {row.stream_url && (
                        <a
                          href={row.stream_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open stream
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {isOwner ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(row)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <>
                          {hasReminder && existing && (
                            <Select
                              value={String(existing.lead_minutes)}
                              onValueChange={(v) => updateReminderLead(existing.id, parseInt(v, 10))}
                            >
                              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LEAD_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            variant={hasReminder ? "secondary" : "default"}
                            size="sm"
                            onClick={() => toggleReminder(row)}
                            className="gap-1"
                          >
                            {hasReminder ? (
                              <><BellOff className="w-4 h-4" /> Remove</>
                            ) : (
                              <><Bell className="w-4 h-4" /> Remind me</>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default StreamSchedule;
