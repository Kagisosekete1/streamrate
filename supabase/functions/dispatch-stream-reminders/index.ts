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

  try {
    const now = new Date();
    // Pull pending reminders for upcoming schedules
    const { data: pending, error } = await supabase
      .from("stream_schedule_reminders")
      .select("id, user_id, schedule_id, lead_minutes, sent_at, stream_schedules!inner(id, user_id, title, scheduled_at, platform, stream_url)")
      .is("sent_at", null)
      .limit(500);

    if (error) throw error;

    let sent = 0;
    for (const r of (pending || []) as any[]) {
      const sched = r.stream_schedules;
      if (!sched) continue;
      const fireAt = new Date(new Date(sched.scheduled_at).getTime() - (r.lead_minutes || 15) * 60_000);
      if (fireAt.getTime() > now.getTime()) continue; // not yet
      // Get streamer username
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", sched.user_id)
        .maybeSingle();
      const who = prof?.username || prof?.full_name || "A streamer";
      const lead = r.lead_minutes || 15;
      const leadLabel = lead >= 60 ? `${Math.round(lead/60)}h` : `${lead}m`;

      const { error: notifErr } = await supabase.from("notifications").insert({
        user_id: r.user_id,
        from_user_id: sched.user_id,
        type: "stream_reminder",
        title: `${who} goes live in ${leadLabel}`,
        message: sched.title,
      });
      if (notifErr) {
        console.error("notif insert failed", notifErr);
        continue;
      }
      await supabase
        .from("stream_schedule_reminders")
        .update({ sent_at: now.toISOString() })
        .eq("id", r.id);
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent, scanned: (pending || []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dispatch-stream-reminders failed", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});