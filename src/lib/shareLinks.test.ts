import { describe, expect, it } from "vitest";
import { getCanonicalPostUrl, getPostPreviewUrl, getPostShareTargetUrl, getShareDestinationUrl, type ShareDestination } from "./shareLinks";

const postId = "11111111-1111-4111-8111-111111111111";
const origin = "https://www.streamrateapp.com/";
const functionsOrigin = "https://cloud.example.test";
const canonical = `https://www.streamrateapp.com/post/${postId}`;
const preview = `https://cloud.example.test/functions/v1/post-og-preview?id=${postId}`;

describe("post share links", () => {
  it("copies the exact public post route", () => {
    expect(getCanonicalPostUrl(origin, postId)).toBe(canonical);
    expect(getPostShareTargetUrl({ destination: "copy", postId, origin, functionsOrigin })).toBe(canonical);
  });

  it("uses the preview endpoint for social crawlers", () => {
    expect(getPostPreviewUrl(functionsOrigin, origin, postId)).toBe(preview);
    (["facebook", "twitter", "telegram", "whatsapp"] as ShareDestination[]).forEach((destination) => {
      expect(getPostShareTargetUrl({ destination, postId, origin, functionsOrigin })).toBe(preview);
    });
  });

  it.each([
    ["facebook", "https://www.facebook.com/sharer/sharer.php"],
    ["twitter", "https://twitter.com/intent/tweet"],
    ["telegram", "https://t.me/share/url"],
    ["whatsapp", "https://wa.me/"],
  ] as const)("builds a %s share URL containing the exact post preview target", (destination, expectedBase) => {
    const url = getShareDestinationUrl({ destination, postId, origin, functionsOrigin, shareText: "Watch this" });
    expect(url.startsWith(expectedBase)).toBe(true);
    expect(decodeURIComponent(url)).toContain(preview);
  });

  it("native sharing keeps the clean exact post route", () => {
    expect(getShareDestinationUrl({ destination: "native", postId, origin, functionsOrigin, shareText: "Watch this" })).toBe(canonical);
  });
});