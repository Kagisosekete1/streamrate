import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = "447ab0ac-d32a-4aa8-bb29-d4b50c562672";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
const APP_ORIGIN = "https://www.streamrateapp.com";
const LOGO_URL = `${APP_ORIGIN}/logo.png`;

function buildDeepLink(data: Record<string, any>): string {
  const type = String(data?.type ?? "");
  const postId = data?.postId;
  const reelId = data?.reelId;
  const commentId = data?.commentId;
  const fromUserId = data?.fromUserId;

  // Reel-based notifications
  if (reelId || type.startsWith("reel_")) {
    return `${APP_ORIGIN}/reels?id=${reelId ?? ""}`;
  }
  // Post/comment-based notifications
  if (postId || ["post_like", "comment", "comment_like", "comment_reply", "mention", "new_post"].includes(type)) {
    const hash = commentId ? `#comment-${commentId}` : "";
    return `${APP_ORIGIN}/post/${postId ?? ""}${hash}`;
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
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
