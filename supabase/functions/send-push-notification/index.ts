import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-webhook-secret",
};

const ONESIGNAL_APP_ID = "447ab0ac-d32a-4aa8-bb29-d4b50c562672";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
const PUSH_WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
const APP_ORIGIN = "https://streamrateapp.com";
const LOGO_URL = `${APP_ORIGIN}/zyiro-mark.png`;
const WEB_ICON_URL = `${APP_ORIGIN}/__l5e/assets-v1/29ab3d65-7964-4f3f-a4d7-9fea62411606/streamrate-push-icon-192.png`;
const WEB_BADGE_URL = `${APP_ORIGIN}/__l5e/assets-v1/ce739aca-2329-46b8-ad6a-1e1ecbcc729d/streamrate-push-badge-96.png`;

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

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0;
}

function buildDeepLink(data: Record<string, any>): string {
  const type = String(data?.type ?? "");
  const postId = data?.postId;
  const reelId = data?.reelId;
  const commentId = data?.commentId;
  const fromUserId = data?.fromUserId;

  if (reelId && (type.startsWith("reel_") || ["reel_like", "reel_comment", "reel_share"].includes(type))) {
    return `${APP_ORIGIN}/reels?reelId=${encodeURIComponent(reelId)}`;
  }

  if (postId && ["post_like", "post_share", "post_view", "comment", "comment_like", "comment_reply", "mention", "new_post"].includes(type)) {
    const commentQuery = commentId && ["comment", "comment_like", "comment_reply", "mention"].includes(type)
      ? `?commentId=${encodeURIComponent(commentId)}`
      : "";
    return `${APP_ORIGIN}/post/${encodeURIComponent(postId)}${commentQuery}`;
  }

  if (["follow", "new_follower", "profile_view"].includes(type) && fromUserId) {
    return `${APP_ORIGIN}/streamer/${encodeURIComponent(fromUserId)}`;
  }

  if (type === "party_join") return `${APP_ORIGIN}/watch-parties`;
  if (type === "profile_boost") return `${APP_ORIGIN}/profile`;
  if (type === "poll_vote" || type === "raid" || type === "co_stream") return `${APP_ORIGIN}/live`;
  if (type === "lfg_response") return fromUserId ? `${APP_ORIGIN}/streamer/${encodeURIComponent(fromUserId)}` : `${APP_ORIGIN}/squad-up`;
  if (type === "tournament") return `${APP_ORIGIN}/tournaments`;
  if (type === "reminder" || type.includes("stream")) return `${APP_ORIGIN}/reminders`;
  if (fromUserId) return `${APP_ORIGIN}/streamer/${encodeURIComponent(fromUserId)}`;
  if (postId) return `${APP_ORIGIN}/post/${encodeURIComponent(postId)}`;
  return `${APP_ORIGIN}/notifications`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!PUSH_WEBHOOK_SECRET || !constantTimeEqual(req.headers.get("x-push-webhook-secret") ?? "", PUSH_WEBHOOK_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error("ONESIGNAL_REST_API_KEY not configured");
    }

    const body = await req.json();
    const notificationId = String(body?.notificationId ?? "");
    if (!admin || !notificationId) {
      await logDispatch({
        user_id: null,
        status: "invalid_input",
        error: "A notificationId is required",
      });
      return new Response(
        JSON.stringify({ error: "A notificationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: notification, error: notificationError } = await admin.from("notifications")
      .select("id,user_id,title,message,type,post_id,reel_id,comment_id,from_user_id,poll_id")
      .eq("id", notificationId)
      .maybeSingle();
    if (notificationError || !notification) {
      return new Response(JSON.stringify({ error: "Notification not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = notification.user_id;
    const title = notification.title || "ZYIRO";
    const message = notification.message || "You have a new notification.";
    const type = String(notification.type || "");
    const data = {
      type,
      postId: notification.post_id,
      reelId: notification.reel_id,
      commentId: notification.comment_id,
      fromUserId: notification.from_user_id,
      pollId: notification.poll_id,
      notificationId: notification.id,
    };

    const { data: previousDelivery } = await admin.from("push_dispatch_logs")
      .select("id,status")
      .eq("notification_id", notificationId)
      .eq("status", "sent")
      .maybeSingle();
    if (previousDelivery) {
      return new Response(JSON.stringify({ success: true, duplicate: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: preferences } = await admin.from("notification_settings")
      .select("stream_reminders_enabled,raids_enabled,co_stream_requests_enabled,tournament_events_enabled,social_activity_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    const notificationType = type.toLowerCase();
    const preferenceName = notificationType.includes("reminder")
      ? "stream_reminders_enabled"
      : notificationType.includes("raid")
        ? "raids_enabled"
        : notificationType.includes("co_stream")
          ? "co_stream_requests_enabled"
          : notificationType.includes("tournament")
            ? "tournament_events_enabled"
            : "social_activity_enabled";
    if (preferences?.[preferenceName] === false) {
      await logDispatch({ notification_id: notificationId, user_id: userId, notification_type: type, title, message, status: "skipped", error: "Recipient muted this notification category" });
      return new Response(JSON.stringify({ success: true, skipped: "muted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = buildDeepLink(data);
    let actorAvatar: string | null = null;
    let postImage: string | null = null;
    let postText: string | null = null;
    let interactionText: string | null = null;
    let reelThumbnail: string | null = null;

    // Add useful context to Android notifications: the actor's profile photo,
    // the post image (when present), and a short comment/reply excerpt.
    if (admin && data?.fromUserId) {
      const { data: actor } = await admin.from("profiles")
        .select("avatar_url")
        .eq("id", String(data.fromUserId))
        .maybeSingle();
      actorAvatar = actor?.avatar_url ?? null;
    }
    if (admin && data?.postId) {
      const { data: post } = await admin.from("posts")
        .select("image_url, content")
        .eq("id", String(data.postId))
        .maybeSingle();
      postImage = post?.image_url ?? null;
      postText = post?.content ?? null;
    }
    if (data.reelId) {
      const { data: reel } = await admin.from("reels").select("thumbnail_url,caption").eq("id", String(data.reelId)).maybeSingle();
      reelThumbnail = reel?.thumbnail_url ?? null;
      if (!postText) postText = reel?.caption ?? null;
    }
    if (admin && data?.commentId) {
      const table = String(data?.type ?? "").startsWith("reel_") ? "reel_comments" : "comments";
      const { data: comment } = await admin.from(table)
        .select("content")
        .eq("id", String(data.commentId))
        .maybeSingle();
      interactionText = comment?.content ?? null;
    }

    const preview = (interactionText || postText || "").replace(/\s+/g, " ").trim().slice(0, 120);
    const pushMessage = preview && !String(message).toLowerCase().includes(preview.toLowerCase())
      ? `${message}: “${preview}${preview.length >= 120 ? "…" : ""}”`
      : message;

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [String(userId)] },
      target_channel: "push",
      // Zyiro push is delivered to the native Android client only.
      isAndroid: true,
      isIos: false,
      isAnyWeb: false,
      headings: { en: title },
      contents: { en: pushMessage },
      url,
      web_url: url,
      chrome_web_icon: WEB_ICON_URL,
      chrome_web_badge: WEB_BADGE_URL,
      firefox_icon: WEB_ICON_URL,
      large_icon: actorAvatar || LOGO_URL,
      ...(postImage || reelThumbnail ? { big_picture: postImage || reelThumbnail } : {}),
      small_icon: "ic_stat_onesignal_default",
      data: { ...data, url, actorAvatar, postImage, reelThumbnail, postText, interactionText },
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
      notification_id: notificationId,
      user_id: userId,
      notification_type: type,
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
