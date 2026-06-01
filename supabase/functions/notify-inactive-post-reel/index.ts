import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sends an in-app notification ("It's been a while, come post your reel")
// to users who haven't posted a reel in the last 14 days, and haven't
// already received this nudge in the last 7 days.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const sinceDays = 14;
    const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
    const nudgeWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Pull a batch of profiles (cap to keep this safe).
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id")
      .limit(1000);
    if (pErr) throw pErr;

    const targets: string[] = [];
    for (const p of profiles ?? []) {
      const { data: lastReel } = await supabase
        .from("reels")
        .select("created_at")
        .eq("user_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Skip users with a recent reel.
      if (lastReel?.created_at && lastReel.created_at > cutoff) continue;

      const { data: recentNudge } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", p.id)
        .eq("type", "reel_nudge")
        .gt("created_at", nudgeWindow)
        .limit(1)
        .maybeSingle();

      if (recentNudge) continue;
      targets.push(p.id);
    }

    if (targets.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = targets.map((uid) => ({
      user_id: uid,
      type: "reel_nudge",
      title: "It's been a while 👋",
      message: "Come on and post your reel — your fans miss you!",
    }));

    const { error: iErr } = await supabase.from("notifications").insert(rows);
    if (iErr) throw iErr;

    return new Response(JSON.stringify({ ok: true, sent: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-inactive-post-reel error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});