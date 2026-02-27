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
    const { platform, userId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the connected platform info
    const { data: connectedPlatform } = await supabase
      .from("connected_platforms")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", platform)
      .single();

    if (!connectedPlatform) {
      return new Response(JSON.stringify({ error: "Platform not connected" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let analyticsData: Record<string, any> = {
      user_id: userId,
      platform,
      viewer_count: 0,
      peak_viewers: 0,
      is_live: false,
      stream_title: null,
      stream_duration_minutes: 0,
      chat_messages_count: 0,
      follower_count: 0,
      subscriber_count: 0,
      new_followers: 0,
      engagement_rate: 0,
    };

    if (platform === "twitch") {
      const twitchClientId = Deno.env.get("TWITCH_CLIENT_ID");
      const twitchClientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");

      if (twitchClientId && twitchClientSecret) {
        try {
          // Get OAuth token
          const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `client_id=${twitchClientId}&client_secret=${twitchClientSecret}&grant_type=client_credentials`,
          });
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;

          const headers = {
            "Client-ID": twitchClientId,
            "Authorization": `Bearer ${accessToken}`,
          };

          // Get user info
          const userRes = await fetch(
            `https://api.twitch.tv/helix/users?login=${connectedPlatform.platform_username}`,
            { headers }
          );
          const userData = await userRes.json();
          const twitchUser = userData.data?.[0];

          if (twitchUser) {
            // Get stream info (live status)
            const streamRes = await fetch(
              `https://api.twitch.tv/helix/streams?user_id=${twitchUser.id}`,
              { headers }
            );
            const streamData = await streamRes.json();
            const stream = streamData.data?.[0];

            // Get followers
            const followersRes = await fetch(
              `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${twitchUser.id}`,
              { headers }
            );
            const followersData = await followersRes.json();

            analyticsData = {
              ...analyticsData,
              is_live: !!stream,
              viewer_count: stream?.viewer_count || 0,
              peak_viewers: stream?.viewer_count || 0,
              stream_title: stream?.title || null,
              follower_count: followersData.total || 0,
            };

            // Update platform user ID
            await supabase
              .from("connected_platforms")
              .update({ platform_user_id: twitchUser.id, last_synced_at: new Date().toISOString() })
              .eq("id", connectedPlatform.id);
          }
        } catch (e) {
          console.error("Twitch API error:", e);
        }
      }
    }

    // For Kick and Discord, store placeholder data (no official public API for Kick)
    // Discord bot integration would need a bot token and specific guild setup

    // Insert analytics snapshot
    await supabase.from("streaming_analytics").insert(analyticsData);

    // Update last synced
    await supabase
      .from("connected_platforms")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connectedPlatform.id);

    return new Response(JSON.stringify({ success: true, data: analyticsData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
