import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = "447ab0ac-d32a-4aa8-bb29-d4b50c562672";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
const APP_ORIGIN = "https://www.streamrateapp.com";
const LOGO_URL = `${APP_ORIGIN}/logo.png`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

async function logDispatch(row: Record<string, unknown>) {
  if (!admin) return;
  try {
    await admin.from("push_dispatch_logs").insert(row);
  } catch (e) {
    console.warn("push_dispatch_logs insert failed", e);
  }
}

function buildDeepLink(data: Record<string, any>): string {
  const type = String(data?.type ?? "");
  const postId = data?.postId;
  const reelId = data?.reelId;
  const commentId = data?.commentId;
  const fromUserId = data?.fromUserId;

  // Reel-based notifications
  if (reelId || type.startsWith("reel_")) {
    return `${APP_ORIGIN}/reels?reelId=${reelId ?? ""}`;
  }
  // Post/comment-based notifications
  if (postId || ["post_like", "post_share", "comment", "comment_like", "comment_reply", "mention", "new_post"].includes(type)) {
    const commentQuery = commentId && ["comment", "comment_like", "comment_reply", "mention"].includes(type)
      ? `?commentId=${commentId}`
      : "";
    return `${APP_ORIGIN}/post/${postId ?? ""}${commentQuery}`;
  }
  // Follower / profile-view / referral / raid / poll / party — link to source user
  if (fromUserId) {
    return `${APP_ORIGIN}/streamer/${fromUserId}`;
  }
  // Fallbacks by type
  if (type === "tournament") return `${APP_ORIGIN}/tournaments`;
  if (type === "raid" || type === "co_stream") return `${APP_ORIGIN}/live`;
  if (type === "reminder" || type.includes("stream")) return `${APP_ORIGIN}/reminders`;
  return `${APP_ORIGIN}/notifications`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error("ONESIGNAL_REST_API_KEY not configured");
    }

    const body = await req.json();
    const { userId, title, message, data = {} } = body ?? {};

    if (!userId || !title || !message) {
      await logDispatch({
        user_id: null,
        notification_type: (data as any)?.type ?? null,
        title: title ?? null,
        message: message ?? null,
        status: "invalid_input",
        error: "userId, title and message are required",
        payload: body ?? {},
      });
      return new Response(
        JSON.stringify({ error: "userId, title and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = buildDeepLink(data);

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [String(userId)] },
      target_channel: "push",
      headings: { en: title },
      contents: { en: message },
      url,
      web_url: url,
      chrome_web_icon: LOGO_URL,
      chrome_web_badge: LOGO_URL,
      firefox_icon: LOGO_URL,
      large_icon: LOGO_URL,
      small_icon: LOGO_URL,
      data: { ...data, url },
    };

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("OneSignal response:", response.status, JSON.stringify(result));

    await logDispatch({
      user_id: userId,
      notification_type: (data as any)?.type ?? null,
      title,
      message,
      deep_link: url,
      status: response.ok ? "sent" : "failed",
      http_status: response.status,
      error: response.ok ? null : (typeof result === "object" ? JSON.stringify(result).slice(0, 2000) : String(result)),
      onesignal_id: (result as any)?.id ?? null,
      payload,
      response: result,
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "OneSignal request failed", result }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, url, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending OneSignal push:", error);
    await logDispatch({
      status: "exception",
      error: (error as Error).message,
    });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
