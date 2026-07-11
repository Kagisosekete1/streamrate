export type ShareDestination = "copy" | "facebook" | "twitter" | "whatsapp" | "telegram" | "native";

type ShareUrlInput = {
  destination: ShareDestination;
  postId: string;
  origin: string;
  shareText: string;
  functionsOrigin?: string;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

export const getCanonicalPostUrl = (origin: string, postId: string): string => {
  return `${trimTrailingSlash(origin)}/post/${encodeURIComponent(postId)}`;
};

export const getPostPreviewUrl = (functionsOrigin: string | undefined, origin: string, postId: string): string => {
  if (!functionsOrigin) return getCanonicalPostUrl(origin, postId);
  return `${trimTrailingSlash(functionsOrigin)}/functions/v1/post-og-preview?id=${encodeURIComponent(postId)}`;
};

export const getPostShareTargetUrl = ({ destination, postId, origin, functionsOrigin }: Omit<ShareUrlInput, "shareText">): string => {
  if (destination === "copy" || destination === "native") {
    return getCanonicalPostUrl(origin, postId);
  }
  return getPostPreviewUrl(functionsOrigin, origin, postId);
};

export const getShareDestinationUrl = (input: ShareUrlInput): string => {
  const targetUrl = getPostShareTargetUrl(input);
  const encodedTarget = encodeURIComponent(targetUrl);
  const encodedText = encodeURIComponent(input.shareText);

  switch (input.destination) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedTarget}&quote=${encodedText}`;
    case "twitter":
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedTarget}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${input.shareText}\n${targetUrl}`)}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodedTarget}&text=${encodedText}`;
    case "copy":
    case "native":
    default:
      return targetUrl;
  }
};