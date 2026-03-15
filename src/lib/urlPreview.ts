const SOCIAL_HOSTS = [
  "facebook.com",
  "fb.watch",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "instagram.com",
  "instagr.am",
  "threads.net",
  "youtube.com",
  "youtu.be",
] as const;

const URL_MATCH_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
const TRAILING_PUNCTUATION_REGEX = /[)\],.!?]+$/;

export const normalizePreviewUrl = (rawUrl: string): string | null => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
};

export const extractFirstUrl = (text: string): string | null => {
  const match = text.match(URL_MATCH_REGEX);
  if (!match?.[0]) return null;

  const cleanedUrl = match[0].replace(TRAILING_PUNCTUATION_REGEX, "");
  return normalizePreviewUrl(cleanedUrl);
};

export const getPreviewHostname = (url: string): string | null => {
  const normalized = normalizePreviewUrl(url);
  if (!normalized) return null;

  try {
    return new URL(normalized).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
};

export const isSocialLink = (url: string): boolean => {
  const hostname = getPreviewHostname(url);
  if (!hostname) return false;

  return SOCIAL_HOSTS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
};

const getYouTubeVideoId = (url: URL): string | null => {
  if (url.hostname.includes("youtu.be")) {
    const pathId = url.pathname.split("/").filter(Boolean)[0];
    return pathId || null;
  }

  if (url.hostname.includes("youtube.com")) {
    const searchId = url.searchParams.get("v");
    if (searchId) return searchId;

    const shortsMatch = url.pathname.match(/\/shorts\/([^/?]+)/i);
    if (shortsMatch?.[1]) return shortsMatch[1];
  }

  return null;
};

export const getSocialThumbnailUrl = (url: string): string | null => {
  const normalized = normalizePreviewUrl(url);
  if (!normalized || !isSocialLink(normalized)) return null;

  try {
    const parsed = new URL(normalized);

    const youtubeVideoId = getYouTubeVideoId(parsed);
    if (youtubeVideoId) {
      return `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`;
    }

    return `https://image.thum.io/get/ogImage/noanimate/${normalized}`;
  } catch {
    return null;
  }
};
