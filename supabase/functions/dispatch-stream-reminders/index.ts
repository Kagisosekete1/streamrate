import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const started = Date.now();
  const errors: Array<{ reminder_id?: string; user_id?: string; message: string }> = [];
  let scanned = 0;
  let sent = 0;
  let skipped = 0;
  let status: "ok" | "partial" | "error" = "ok";

  try {
    const now = new Date();
    const { data: pending, error } = await supabase
      .from("stream_schedule_reminders")
      .select(
        "id, user_id, schedule_id, lead_minutes, sent_at, attempt_count, stream_schedules!inner(id, user_id, title, scheduled_at, platform, stream_url)",
      )
      .is("sent_at", null)
      .limit(500);

    if (error) throw error;
    scanned = (pending || []).length;

    for (const r of (pending || []) as any[]) {
      const sched = r.stream_schedules;
      if (!sched) { skipped++; continue; }
      const fireAt = new Date(
        new Date(sched.scheduled_at).getTime() - (r.lead_minutes || 15) * 60_000,
      );
      if (fireAt.getTime() > now.getTime()) { skipped++; continue; }

      // Respect user notification preferences
      const { data: prefs } = await supabase
        .from("notification_settings")
        .select("stream_reminders_enabled")
        .eq("user_id", r.user_id)
        .maybeSingle();
      if (prefs && prefs.stream_reminders_enabled === false) {
        await supabase
          .from("stream_schedule_reminders")
          .update({ sent_at: now.toISOString(), last_error: "user_disabled_reminders" })
          .eq("id", r.id);
        skipped++;
        continue;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", sched.user_id)
        .maybeSingle();
      const who = prof?.username || prof?.full_name || "A streamer";
      const lead = r.lead_minutes || 15;
      const leadLabel = lead >= 60 ? `${Math.round(lead / 60)}h` : `${lead}m`;

      const { error: notifErr } = await supabase.from("notifications").insert({
        user_id: r.user_id,
        from_user_id: sched.user_id,
        type: "stream_reminder",
        title: `${who} goes live in ${leadLabel}`,
        message: sched.title,
      });
      if (notifErr) {
        console.error("notif insert failed", notifErr);
        const attempt = (r.attempt_count || 0) + 1;
        await supabase
          .from("stream_schedule_reminders")
          .update({ attempt_count: attempt, last_error: notifErr.message })
          .eq("id", r.id);
        errors.push({ reminder_id: r.id, user_id: r.user_id, message: notifErr.message });
        status = "partial";
        continue;
      }
      await supabase
        .from("stream_schedule_reminders")
        .update({ sent_at: now.toISOString(), last_error: null })
        .eq("id", r.id);
      sent++;
    }

    await supabase.from("reminder_dispatch_logs").insert({
      status, scanned, sent, skipped, errors, duration_ms: Date.now() - started,
    });

    return new Response(
      JSON.stringify({ ok: true, status, scanned, sent, skipped, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("dispatch-stream-reminders failed", e);
    try {
      await supabase.from("reminder_dispatch_logs").insert({
        status: "error",
        scanned, sent, skipped,
        errors: [...errors, { message: String((e as Error).message || e) }],
        duration_ms: Date.now() - started,
      });
    } catch { /* swallow */ }
    return new Response(
      JSON.stringify({ error: String((e as Error).message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});