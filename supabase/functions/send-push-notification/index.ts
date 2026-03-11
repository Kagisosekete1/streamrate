import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBPUSHR_KEY = "fa200af9ee0a191b63247fe29832636d";
const WEBPUSHR_AUTH_TOKEN = "119503";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, message, target_url, sid, icon, image } = await req.json();

    if (!title || !message || !target_url) {
      return new Response(
        JSON.stringify({ error: "title, message, and target_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: Record<string, unknown> = {
      title,
      message,
      target_url,
    };

    if (icon) payload.icon = icon;
    if (image) payload.image = image;

    // Determine endpoint: send to specific subscriber or all
    const endpoint = sid
      ? "https://api.webpushr.com/v1/notification/send/sid"
      : "https://api.webpushr.com/v1/notification/send/all";

    if (sid) {
      payload.sid = sid;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "Application/Json",
        "webpushrKey": WEBPUSHR_KEY,
        "webpushrAuthToken": WEBPUSHR_AUTH_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("Webpushr response:", JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending Webpushr notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
