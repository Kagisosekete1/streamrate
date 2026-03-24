export type StreamPlatform = "twitch" | "kick" | "youtube";

const hasProtocol = (value: string) => /^https?:\/\//i.test(value);

const normalizeHandle = (value: string) => value.trim().replace(/^@+/, "").replace(/^\/+/, "");

export const normalizeStreamUrl = (platform: StreamPlatform, rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  if (hasProtocol(trimmed)) return trimmed;

  if (platform === "youtube" && trimmed.startsWith("@")) {
    return `https://www.youtube.com/${trimmed}`;
  }

  if (!trimmed.includes(".")) {
    const handle = normalizeHandle(trimmed);
    if (!handle) return "";

    if (platform === "twitch") return `https://www.twitch.tv/${handle}`;
    if (platform === "kick") return `https://kick.com/${handle}`;
    return `https://www.youtube.com/@${handle}`;
  }

  return `https://${trimmed}`;
};
