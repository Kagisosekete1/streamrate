export type StreamPlatform = "twitch" | "kick" | "youtube" | "custom";

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
    if (platform === "custom") return "";
    return `https://www.youtube.com/@${handle}`;
  }

  return `https://${trimmed}`;
};

/**
 * Validate a stream URL/handle and return a canonical, embed-safe URL.
 * Returns { ok: true, url } when valid for the platform, otherwise { ok: false, error }.
 */
export const validateStreamUrl = (
  platform: StreamPlatform,
  rawUrl: string,
): { ok: true; url: string } | { ok: false; error: string } => {
  const value = (rawUrl || "").trim();
  if (!value) return { ok: false, error: "Stream URL or channel name is required." };

  const normalized = normalizeStreamUrl(platform, value);
  if (!normalized) return { ok: false, error: "Enter a valid channel or URL." };

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (platform === "custom") {
    if (!/^https?:$/.test(parsed.protocol)) {
      return { ok: false, error: "Use a valid http(s) URL." };
    }
    return { ok: true, url: normalized };
  }

  if (platform === "twitch") {
    if (!/(^|\.)twitch\.tv$/.test(host)) {
      return { ok: false, error: "Use a twitch.tv URL or channel name." };
    }
    const channel = parsed.pathname.split("/").filter(Boolean)[0];
    if (!channel || !/^[A-Za-z0-9_]{3,25}$/.test(channel)) {
      return { ok: false, error: "Couldn't read the Twitch channel name." };
    }
    return { ok: true, url: `https://www.twitch.tv/${channel}` };
  }

  if (platform === "kick") {
    if (!/(^|\.)kick\.com$/.test(host)) {
      return { ok: false, error: "Use a kick.com URL or channel name." };
    }
    const channel = parsed.pathname.split("/").filter(Boolean)[0];
    if (!channel || !/^[A-Za-z0-9_-]{3,30}$/.test(channel)) {
      return { ok: false, error: "Couldn't read the Kick channel name." };
    }
    return { ok: true, url: `https://kick.com/${channel}` };
  }

  // youtube
  if (!/(^|\.)youtube\.com$/.test(host) && host !== "youtu.be") {
    return { ok: false, error: "Use a youtube.com or youtu.be URL." };
  }
  // Accept video, live, embed, channel handle, or watch?v=
  const idMatch =
    normalized.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if (idMatch) return { ok: true, url: `https://www.youtube.com/watch?v=${idMatch[1]}` };
  const handle = parsed.pathname.replace(/^\//, "").split("/")[0];
  if (handle && /^@?[A-Za-z0-9._-]{3,50}$/.test(handle)) {
    const h = handle.startsWith("@") ? handle : `@${handle}`;
    return { ok: true, url: `https://www.youtube.com/${h}` };
  }
  return { ok: false, error: "Enter a YouTube video, live, or channel URL." };
};
