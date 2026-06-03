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
  profile?: {
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
}

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
    ? { hour: "numeric", minute: "2-digit" }
    : { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  return date.toLocaleString(undefined, opts);
};

const StreamSchedule = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [reminderIds, setReminderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "mine">("upcoming");

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<StreamPlatform>("twitch");
  const [streamUrl, setStreamUrl] = useState("");
  const [whenLocal, setWhenLocal] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const nowIso = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data, error } = await (supabase as any)
      .from("stream_schedules")
      .select("id, user_id, title, description, platform, stream_url, scheduled_at")
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
        .select("schedule_id")
        .eq("user_id", user.id);
      setReminderIds(new Set(((rem || []) as any[]).map((r) => r.schedule_id)));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [user?.id]);

  const visibleRows = useMemo(() => {
    if (tab === "mine") return rows.filter((r) => r.user_id === user?.id);
    return rows;
  }, [rows, tab, user?.id]);

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
    const when = new Date(whenLocal);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 5 * 60 * 1000) {
      toast({ title: "Pick a future date/time", variant: "destructive" });
      return;
    }

    let normalizedUrl: string | null = null;
    if (streamUrl.trim()) {
      const res = validateStreamUrl(platform, streamUrl);
      if (!res.ok) {
        toast({ title: "Invalid stream URL", description: res.error, variant: "destructive" });
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
    const has = reminderIds.has(row.id);
    if (has) {
      const { error } = await (supabase as any)
        .from("stream_schedule_reminders")
        .delete()
        .eq("schedule_id", row.id)
        .eq("user_id", user.id);
      if (error) {
        toast({ title: "Couldn't remove reminder", description: error.message, variant: "destructive" });
        return;
      }
      const next = new Set(reminderIds);
      next.delete(row.id);
      setReminderIds(next);
      toast({ title: "Reminder removed" });
    } else {
      const { error } = await (supabase as any)
        .from("stream_schedule_reminders")
        .insert({ schedule_id: row.id, user_id: user.id });
      if (error) {
        toast({ title: "Couldn't set reminder", description: error.message, variant: "destructive" });
        return;
      }
      const next = new Set(reminderIds);
      next.add(row.id);
      setReminderIds(next);

      // Best-effort browser notification permission + local alarm while app is open
      try {
        if ("Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission();
        }
      } catch { /* ignore */ }
      toast({ title: "You'll be reminded", description: formatWhen(row.scheduled_at) });
    }
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
          <div className="max-w-2xl mx-auto px-4 pb-2 flex gap-2">
            {(["upcoming", "mine"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition",
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "upcoming" ? "Upcoming" : "My schedule"}
              </button>
            ))}
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
                {tab === "mine" ? "You haven't scheduled any streams" : "Nothing scheduled yet"}
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
              const hasReminder = reminderIds.has(row.id);
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
                      {row.description && (
                        <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">
                          {row.description}
                        </p>
                      )}
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
                    <div className="flex items-center gap-2">
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
                        <Button
                          variant={hasReminder ? "secondary" : "default"}
                          size="sm"
                          onClick={() => toggleReminder(row)}
                          className="gap-1"
                        >
                          {hasReminder ? (
                            <><BellOff className="w-4 h-4" /> Reminding</>
                          ) : (
                            <><Bell className="w-4 h-4" /> Remind me</>
                          )}
                        </Button>
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