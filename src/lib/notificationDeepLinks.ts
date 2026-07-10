export type NotificationRouteInput = {
  type?: string | null;
  post_id?: string | null;
  reel_id?: string | null;
  comment_id?: string | null;
  from_user_id?: string | null;
};

const POST_TYPES = new Set([
  "post_like",
  "post_share",
  "comment",
  "comment_like",
  "comment_reply",
  "mention",
  "new_post",
]);

const REEL_TYPES = new Set(["reel_like", "reel_comment", "reel_share"]);

export const getNotificationRoute = (notification: NotificationRouteInput): string => {
  const type = notification.type ?? "";

  if (notification.reel_id && (REEL_TYPES.has(type) || type.startsWith("reel_"))) {
    return `/reels?reelId=${encodeURIComponent(notification.reel_id)}`;
  }

  if (notification.post_id && POST_TYPES.has(type)) {
    const commentQuery = notification.comment_id
      ? `?commentId=${encodeURIComponent(notification.comment_id)}`
      : "";
    return `/post/${encodeURIComponent(notification.post_id)}${commentQuery}`;
  }

  if (type === "profile_view" && notification.from_user_id) {
    return `/streamer/${encodeURIComponent(notification.from_user_id)}`;
  }

  if ((type === "follow" || type === "new_follower") && notification.from_user_id) {
    return `/streamer/${encodeURIComponent(notification.from_user_id)}`;
  }

  if (type === "party_join") return "/watch-parties";
  if (type === "poll_vote" || type === "raid" || type === "co_stream") return "/live";
  if (type === "lfg_response") {
    return notification.from_user_id
      ? `/streamer/${encodeURIComponent(notification.from_user_id)}`
      : "/squad-up";
  }
  if (type === "tournament") return "/tournaments";
  if (type === "reminder" || type.includes("stream")) return "/reminders";

  if (notification.from_user_id) {
    return `/streamer/${encodeURIComponent(notification.from_user_id)}`;
  }

  if (notification.post_id) {
    return `/post/${encodeURIComponent(notification.post_id)}`;
  }

  return "/notifications";
};

export const getNotificationAbsoluteUrl = (
  origin: string,
  notification: NotificationRouteInput,
): string => `${origin.replace(/\/$/, "")}${getNotificationRoute(notification)}`;