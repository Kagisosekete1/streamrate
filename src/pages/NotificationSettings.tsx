import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

type PermState = "default" | "granted" | "denied" | "unsupported";

const NotificationSettings = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [raids, setRaids] = useState(true);
  const [coStream, setCoStream] = useState(true);
  const [tourneys, setTourneys] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perm, setPerm] = useState<PermState>("default");

  useEffect(() => {
    if (typeof Notification === "undefined") setPerm("unsupported");
    else setPerm(Notification.permission as PermState);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await (supabase as any)
        .from("notification_settings")
        .select("stream_reminders_enabled, raids_enabled, co_stream_requests_enabled, tournament_events_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setEnabled(!!data.stream_reminders_enabled);
        setRaids(data.raids_enabled !== false);
        setCoStream(data.co_stream_requests_enabled !== false);
        setTourneys(data.tournament_events_enabled !== false);
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const saveField = async (
    field: "stream_reminders_enabled" | "raids_enabled" | "co_stream_requests_enabled" | "tournament_events_enabled",
    value: boolean,
    setter: (v: boolean) => void,
    prev: boolean,
    label: string,
  ) => {
    if (!user) return;
    setSaving(true);
    setter(value);
    const { error } = await (supabase as any)
      .from("notification_settings")
      .upsert({ user_id: user.id, [field]: value }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      setter(prev);
      return;
    }
    toast({ title: `${label} ${value ? "enabled" : "muted"}` });
  };

  const requestPerm = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "denied") {
      toast({
        title: "Permission blocked",
        description:
          "Your browser has blocked notifications for this site. Open site settings (the lock icon in your address bar) and allow notifications, then refresh.",
      });
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPerm(res as PermState);
      if (res === "granted") toast({ title: "Notifications enabled" });
      else toast({ title: "Notifications not granted", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Couldn't request permission", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-2xl mx-auto flex items-center gap-2 px-4 h-14">
            <Link to="/settings" className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Bell className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg text-foreground">Notifications</h1>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <section className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">Stream reminders</h2>
                    <p className="text-sm text-muted-foreground">
                      Get notified before a streamer you've reminded yourself about goes live.
                    </p>
                  </div>
                  <Switch checked={enabled} disabled={saving} onCheckedChange={(v) => saveField("stream_reminders_enabled", v, setEnabled, enabled, "Reminders")} />
                </div>
              </section>

              <section className="bg-card border border-border rounded-2xl p-4 divide-y divide-border">
                <div className="flex items-start justify-between gap-3 pb-3">
                  <div>
                    <h2 className="font-semibold text-foreground">Raids</h2>
                    <p className="text-sm text-muted-foreground">Alerts when a streamer raids into your channel or one you follow.</p>
                  </div>
                  <Switch checked={raids} disabled={saving} onCheckedChange={(v) => saveField("raids_enabled", v, setRaids, raids, "Raid alerts")} />
                </div>
                <div className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <h2 className="font-semibold text-foreground">Co-stream requests</h2>
                    <p className="text-sm text-muted-foreground">Alerts when another streamer invites you to co-stream or replies to your request.</p>
                  </div>
                  <Switch checked={coStream} disabled={saving} onCheckedChange={(v) => saveField("co_stream_requests_enabled", v, setCoStream, coStream, "Co-stream alerts")} />
                </div>
                <div className="flex items-start justify-between gap-3 pt-3">
                  <div>
                    <h2 className="font-semibold text-foreground">Tournament events</h2>
                    <p className="text-sm text-muted-foreground">Bracket updates, match results, and tournaments you're registered in.</p>
                  </div>
                  <Switch checked={tourneys} disabled={saving} onCheckedChange={(v) => saveField("tournament_events_enabled", v, setTourneys, tourneys, "Tournament alerts")} />
                </div>
              </section>

              <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {perm === "granted" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">Browser notification permission</h2>
                    <p className="text-sm text-muted-foreground">
                      {perm === "unsupported" && "Your browser does not support web notifications."}
                      {perm === "granted" && "Allowed — reminders can pop up even when the app is in the background."}
                      {perm === "default" && "Not requested yet. Allow to get reminder pop-ups."}
                      {perm === "denied" &&
                        "Currently blocked. Use your browser's site settings (lock icon in the URL bar) to allow notifications, then refresh."}
                    </p>
                  </div>
                </div>
                {perm !== "granted" && perm !== "unsupported" && (
                  <Button onClick={requestPerm} size="sm">
                    {perm === "denied" ? "How to unblock" : "Allow notifications"}
                  </Button>
                )}
              </section>

              <p className="text-xs text-muted-foreground text-center">
                You can manage individual reminders on the{" "}
                <Link to="/reminders" className="text-primary underline">Reminders</Link> page.
              </p>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default NotificationSettings;