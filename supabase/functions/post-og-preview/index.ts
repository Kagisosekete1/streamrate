import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_ORIGIN = "https://www.streamrateapp.com";
const FALLBACK_IMAGE = `${APP_ORIGIN}/__l5e/assets-v1/1036deb6-3d8c-4d5b-a934-92d6863b45db/streamrate-notification-logo.png`;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const truncate = (value: string, max: number): string => {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
};

serve(async (req) => {
  const url = new URL(req.url);
  const postId = url.searchParams.get("id");

  if (!postId) {
    return new Response("Missing post id", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !supabaseKey) {
    return new Response("Backend not configured", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data: post } = await supabase
    .from("posts")
    .select("id, content, image_url, user_id, is_private")
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.is_private) {
    return new Response("Post not found", { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", post.user_id)
    .maybeSingle();

  const author = profile?.username || profile?.full_name || "StreamRate creator";
  const title = `@${author} on StreamRate`;
  const description = post.content ? truncate(post.content, 155) : "Open this StreamRate post.";
  const imageUrl = post.image_url || profile?.avatar_url || FALLBACK_IMAGE;
  const postUrl = `${APP_ORIGIN}/post/${post.id}`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="StreamRate" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta http-equiv="refresh" content="0;url=${postUrl}" />
</head>
<body>
  <p>Opening <a href="${postUrl}">this StreamRate post</a>…</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "X-StreamRate-Preview": "post-og-v2",
    },
  });
});