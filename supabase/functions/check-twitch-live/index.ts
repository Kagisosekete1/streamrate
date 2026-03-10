import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWITCH_CLIENT_ID = Deno.env.get("TWITCH_CLIENT_ID");
    const TWITCH_CLIENT_SECRET = Deno.env.get("TWITCH_CLIENT_SECRET");

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ is_live: false, error: "Twitch credentials not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { username } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ is_live: false, error: "username required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OAuth token
    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Check stream status
    const streamRes = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${username}`,
      {
        headers: {
          "Client-ID": TWITCH_CLIENT_ID,
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );
    const streamData = await streamRes.json();
    const stream = streamData.data?.[0];

    return new Response(
      JSON.stringify({
        is_live: !!stream,
        stream_title: stream?.title || null,
        viewer_count: stream?.viewer_count || 0,
        game_name: stream?.game_name || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking Twitch live:", error);
    return new Response(
      JSON.stringify({ is_live: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
