import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const PRIVATE_HOST_REGEX = /(^localhost$|\.local$)/i;
const PRIVATE_IPV4_REGEX = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isAllowedSocialHost = (hostname: string): boolean => {
  const normalized = hostname.replace(/^www\./i, "").toLowerCase();
  return SOCIAL_HOSTS.some((host) => normalized === host || normalized.endsWith(`.${host}`));
};

const isPrivateHost = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  return PRIVATE_HOST_REGEX.test(normalized) || PRIVATE_IPV4_REGEX.test(normalized);
};

const getYouTubeThumbnail = (url: URL): string | null => {
  if (url.hostname.includes("youtu.be")) {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  }

  if (url.hostname.includes("youtube.com")) {
    const videoId = url.searchParams.get("v");
    if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const shortsMatch = url.pathname.match(/\/shorts\/([^/?]+)/i);
    if (shortsMatch?.[1]) {
      return `https://i.ytimg.com/vi/${shortsMatch[1]}/hqdefault.jpg`;
    }
  }

  return null;
};

const resolveAbsoluteUrl = (candidate: string | null, baseUrl: string): string | null => {
  if (!candidate) return null;
  try {
    return new URL(decodeHtmlEntities(candidate), baseUrl).toString();
  } catch {
    return null;
  }
};

const extractMetaTagContent = (html: string, keys: string[]): string | null => {
  for (const key of keys) {
    const escapedKey = escapeRegExp(key);
    const propertyFirst = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    );
    const contentFirst = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedKey}["'][^>]*>`,
      "i",
    );

    const propertyMatch = html.match(propertyFirst);
    if (propertyMatch?.[1]) return decodeHtmlEntities(propertyMatch[1].trim());

    const contentMatch = html.match(contentFirst);
    if (contentMatch?.[1]) return decodeHtmlEntities(contentMatch[1].trim());
  }

  return null;
};

const fetchJson = async (url: string): Promise<Record<string, unknown> | null> => {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const incomingUrl = typeof body?.url === "string" ? body.url.trim() : "";

    if (!incomingUrl) {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = new URL(incomingUrl);
    if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) {
      return new Response(JSON.stringify({ error: "Invalid URL protocol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (isPrivateHost(hostname)) {
      return new Response(JSON.stringify({ error: "Invalid URL host" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAllowedSocialHost(hostname)) {
      return new Response(JSON.stringify({ thumbnailUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedUrl = parsed.toString();

    const youtubeThumbnail = getYouTubeThumbnail(parsed);
    if (youtubeThumbnail) {
      return new Response(
        JSON.stringify({
          thumbnailUrl: youtubeThumbnail,
          resolvedUrl: normalizedUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const encodedUrl = encodeURIComponent(normalizedUrl);
    const oEmbedSources = [
      `https://www.tiktok.com/oembed?url=${encodedUrl}`,
      `https://publish.twitter.com/oembed?url=${encodedUrl}`,
      `https://www.youtube.com/oembed?url=${encodedUrl}`,
      `https://noembed.com/embed?url=${encodedUrl}`,
    ];

    for (const endpoint of oEmbedSources) {
      const data = await fetchJson(endpoint);
      if (!data) continue;

      const thumbnailCandidate = typeof data.thumbnail_url === "string"
        ? data.thumbnail_url
        : typeof data.thumbnailUrl === "string"
          ? data.thumbnailUrl
          : null;

      const resolvedThumbnail = resolveAbsoluteUrl(thumbnailCandidate, normalizedUrl);
      if (resolvedThumbnail) {
        return new Response(
          JSON.stringify({
            thumbnailUrl: resolvedThumbnail,
            title: typeof data.title === "string" ? data.title : null,
            siteName: typeof data.provider_name === "string" ? data.provider_name : null,
            resolvedUrl: normalizedUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const pageResponse = await fetch(normalizedUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    if (!pageResponse.ok) {
      return new Response(JSON.stringify({ thumbnailUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = pageResponse.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return new Response(JSON.stringify({ thumbnailUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await pageResponse.text();
    const resolvedPageUrl = pageResponse.url || normalizedUrl;

    const imageMeta = extractMetaTagContent(html, [
      "og:image",
      "og:image:secure_url",
      "twitter:image",
      "twitter:image:src",
    ]);

    const titleMeta = extractMetaTagContent(html, ["og:title", "twitter:title"]);
    const siteMeta = extractMetaTagContent(html, ["og:site_name"]);
    const resolvedImage = resolveAbsoluteUrl(imageMeta, resolvedPageUrl);
    const fallbackThumbnail = `https://image.thum.io/get/ogImage/noanimate/${normalizedUrl}`;

    return new Response(
      JSON.stringify({
        thumbnailUrl: resolvedImage || fallbackThumbnail,
        title: titleMeta,
        siteName: siteMeta,
        resolvedUrl: resolvedPageUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("social-link-preview error", error);
    return new Response(JSON.stringify({ thumbnailUrl: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});