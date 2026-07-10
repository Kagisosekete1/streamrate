import { describe, expect, it } from "vitest";
import { getNotificationAbsoluteUrl, getNotificationRoute } from "./notificationDeepLinks";

const ids = {
  post: "11111111-1111-4111-8111-111111111111",
  reel: "22222222-2222-4222-8222-222222222222",
  comment: "33333333-3333-4333-8333-333333333333",
  user: "44444444-4444-4444-8444-444444444444",
};

describe("notification deep links", () => {
  it.each([
    ["post_like", `/post/${ids.post}`],
    ["post_share", `/post/${ids.post}`],
    ["new_post", `/post/${ids.post}`],
    ["comment", `/post/${ids.post}?commentId=${ids.comment}`],
    ["comment_like", `/post/${ids.post}?commentId=${ids.comment}`],
    ["comment_reply", `/post/${ids.post}?commentId=${ids.comment}`],
    ["mention", `/post/${ids.post}?commentId=${ids.comment}`],
  ])("routes %s to the exact post/comment", (type, expected) => {
    expect(getNotificationRoute({ type, post_id: ids.post, comment_id: ids.comment })).toBe(expected);
  });

  it.each(["reel_like", "reel_comment", "reel_share"])("routes %s to the exact reel", (type) => {
    expect(getNotificationRoute({ type, reel_id: ids.reel })).toBe(`/reels?reelId=${ids.reel}`);
  });

  it.each(["follow", "new_follower", "profile_view"])("routes %s to the exact streamer", (type) => {
    expect(getNotificationRoute({ type, from_user_id: ids.user })).toBe(`/streamer/${ids.user}`);
  });

  it("builds the same absolute URL shape used by push payloads", () => {
    expect(
      getNotificationAbsoluteUrl("https://www.streamrateapp.com/", {
        type: "comment_reply",
        post_id: ids.post,
        comment_id: ids.comment,
      }),
    ).toBe(`https://www.streamrateapp.com/post/${ids.post}?commentId=${ids.comment}`);
  });
});