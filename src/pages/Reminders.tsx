import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Trash2, Loader2, CalendarClock, ArrowLeft, Clock, CheckCircle2, Settings as SettingsIcon } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const LEAD_OPTIONS = [
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 180, label: "3 hours before" },
  { value: 1440, label: "1 day before" },
];

interface ReminderItem {
  id: string;
  schedule_id: string;
  lead_minutes: number;
  sent_at: string | null;
  schedule: {
    id: string;
    user_id: string;
    title: string;
    platform: string;
    scheduled_at: string;
    timezone: string | null;
  } | null;
  streamer?: { username: string | null; avatar_url: string | null; full_name: string | null } | null;
}

const formatLocal = (d: Date) =>
  d.toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });

const Reminders = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("stream_schedule_reminders")
      .select("id, schedule_id, lead_minutes, sent_at, stream_schedules!inner(id, user_id, title, platform, scheduled_at, timezone)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Couldn't load reminders", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data || []).map((r: any) => ({
      id: r.id,
      schedule_id: r.schedule_id,
      lead_minutes: r.lead_minutes,
      sent_at: r.sent_at,
      schedule: r.stream_schedules,
    })) as ReminderItem[];

    const ids = [...new Set(rows.map((r) => r.schedule?.user_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .in("id", ids);
      const map = new Map((profs || []).map((p) => [p.id, p]));
      rows.forEach((r) => { if (r.schedule) r.streamer = (map.get(r.schedule.user_id) as any) || null; });
    }
    setItems(rows);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const u: ReminderItem[] = []; const p: ReminderItem[] = [];
    items.forEach((i) => {
      const t = i.schedule ? new Date(i.schedule.scheduled_at).getTime() : 0;
      (t >= now ? u : p).push(i);
    });
    u.sort((a, b) => new Date(a.schedule!.scheduled_at).getTime() - new Date(b.schedule!.scheduled_at).getTime());
    return { upcoming: u, past: p };
  }, [items]);

  const updateLead = async (id: string, lead: number) => {
    const { error } = await (supabase as any)
      .from("stream_schedule_reminders")
      .update({ lead_minutes: lead, sent_at: null })
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, lead_minutes: lead, sent_at: null } : r)));
    toast({ title: "Reminder updated" });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this reminder?")) return;
    const { error } = await (supabase as any).from("stream_schedule_reminders").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Reminder removed" });
  };

  const card = (r: ReminderItem) => (
    <div key={r.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Link to={`/u/${r.schedule?.user_id}`} className="shrink-0">
          <img
            src={r.streamer?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face"}
            alt={r.streamer?.username || "Streamer"}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-border"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{r.schedule?.title}</h3>
          <p className="text-xs text-muted-foreground">
            @{r.streamer?.username || "streamer"} • {r.schedule ? new Date(r.schedule.scheduled_at).toLocaleString() : ""}
          </p>
          {(() => {
            if (!r.schedule) return null;
            const fireAt = new Date(new Date(r.schedule.scheduled_at).getTime() - r.lead_minutes * 60_000);
            if (r.sent_at) {
              return (
                <p className="text-[11px] text-green-500 mt-0.5 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Sent {new Date(r.sent_at).toLocaleString()}
                </p>
              );
            }
            if (fireAt.getTime() < Date.now()) {
              return (
                <p className="text-[11px] text-amber-500 mt-0.5 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Sending shortly…
                </p>
              );
            }
            return (
              <p className="text-[11px] text-primary mt-0.5 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> Fires at {formatLocal(fireAt)} (your time)
              </p>
            );
          })()}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
        <Select value={String(r.lead_minutes)} onValueChange={(v) => updateLead(r.id, parseInt(v, 10))}>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LEAD_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={() => remove(r.id)} className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-2xl mx-auto flex items-center gap-2 px-4 h-14">
            <Link to="/schedule" className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Bell className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg text-foreground flex-1">My Reminders</h1>
            <Link
              to="/settings/notifications"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <SettingsIcon className="w-3.5 h-3.5" /> Settings
            </Link>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <CalendarClock className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-foreground font-medium">No reminders yet</p>
              <p className="text-sm text-muted-foreground">
                Set reminders from the <Link to="/schedule" className="text-primary underline">Schedule</Link> page.
              </p>
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">Upcoming ({upcoming.length})</h2>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming reminders.</p>
                ) : upcoming.map(card)}
              </section>
              {past.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground">Past ({past.length})</h2>
                  {past.map(card)}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Reminders;