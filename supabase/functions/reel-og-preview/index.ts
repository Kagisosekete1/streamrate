import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const reelId = url.searchParams.get("id");

  if (!reelId) {
    return new Response("Missing reel id", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: reel } = await supabase
    .from("reels")
    .select("id, caption, video_url, user_id, view_count")
    .eq("id", reelId)
    .maybeSingle();

  if (!reel) {
    return new Response("Reel not found", { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", reel.user_id)
    .maybeSingle();

  const title = reel.caption
    ? reel.caption.substring(0, 60)
    : "Check out this reel on StreamRate!";
  const description = `@${profile?.username || "streamer"} · ${reel.view_count || 0} views`;
  const videoUrl = reel.video_url;
  const siteUrl = "https://streamrate.lovable.app";
  const reelUrl = `${siteUrl}/reel/${reel.id}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} - StreamRate</title>
  <meta property="og:type" content="video.other" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${reelUrl}" />
  <meta property="og:video" content="${videoUrl}" />
  <meta property="og:video:type" content="video/mp4" />
  <meta property="og:video:width" content="720" />
  <meta property="og:video:height" content="1280" />
  <meta property="og:site_name" content="StreamRate" />
  ${profile?.avatar_url ? `<meta property="og:image" content="${profile.avatar_url}" />` : ""}
  <meta name="twitter:card" content="player" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:player" content="${videoUrl}" />
  <meta name="twitter:player:width" content="720" />
  <meta name="twitter:player:height" content="1280" />
  <meta http-equiv="refresh" content="0;url=${reelUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${reelUrl}">StreamRate</a>...</p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
