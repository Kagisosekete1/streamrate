import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are StreamiiAi, the friendly AI assistant for the StreamRate app. You have a fun, gaming-inspired personality.

You ONLY answer questions about the StreamRate app and its features. If someone asks about anything outside the app, politely redirect them.

Here's what you know about StreamRate:

APP FEATURES:
- Home Feed: Users see posts from people they follow, trending streamers section at top
- Reels: TikTok-style short videos, swipe up/down to navigate, double-tap to like
- Create Post: Share text posts with images, AI writing assistant available
- Create Reel: Upload short portrait videos up to 60 seconds
- Discover/Streamers: Browse and find streamers to follow and rate
- Profile: View and edit your profile, see your posts, reels, and bookmarks
- Notifications: Likes, comments, follows, and other activity
- Live: Watch live streams from streamers
- Leaderboard: See top-rated streamers
- Settings: Manage account, privacy, theme (dark/light mode)
- Store: Browse gaming merchandise and products
- Bookmarks: Save posts to view later
- Hashtags: Discover trending topics and content

USER ACTIONS:
- Follow/unfollow users
- Like and comment on posts and reels
- Rate streamers with stars and reviews
- Share posts and reels
- Report or block users
- Edit profile with avatar, bio, social links
- Create and delete posts/reels

IMPORTANT RULES:
- Never use ** for bold text. Just write normally without any markdown bold syntax.
- Keep responses concise and friendly
- Use emojis sparingly for a fun gaming vibe
- If asked about something outside the app, say something like "I'm StreamiiAi, your StreamRate buddy! I can only help with app-related stuff 🎮"
- Be helpful and encouraging`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("StreamiiAi error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
