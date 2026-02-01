import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!text || !action) {
      throw new Error("Text and action are required");
    }

    let systemPrompt = "";

    switch (action) {
      case "fix_grammar":
        systemPrompt = `You are a grammar and spelling expert. Fix any grammatical errors, spelling mistakes, and punctuation issues in the following text. Keep the original meaning and tone. Return ONLY the corrected text without any explanations or additional comments.`;
        break;
      case "rephrase":
        systemPrompt = `You are a creative writer. Rephrase the following text to make it more engaging and natural while keeping the same meaning. Return ONLY the rephrased text without any explanations or additional comments.`;
        break;
      case "make_formal":
        systemPrompt = `You are a professional writer. Rewrite the following text in a more formal and professional tone while keeping the same meaning. Return ONLY the formal version without any explanations or additional comments.`;
        break;
      case "make_casual":
        systemPrompt = `You are a social media expert. Rewrite the following text in a more casual, friendly tone suitable for social media. Add relevant emojis if appropriate. Return ONLY the casual version without any explanations or additional comments.`;
        break;
      case "shorten":
        systemPrompt = `You are a concise writer. Shorten the following text while keeping the key message. Make it punchy and engaging. Return ONLY the shortened text without any explanations or additional comments.`;
        break;
      case "expand":
        systemPrompt = `You are a creative writer. Expand the following text with more details and context while keeping it engaging. Return ONLY the expanded text without any explanations or additional comments.`;
        break;
      default:
        systemPrompt = `You are a helpful writing assistant. Improve the following text. Return ONLY the improved text without any explanations or additional comments.`;
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
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || text;

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI writing assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
