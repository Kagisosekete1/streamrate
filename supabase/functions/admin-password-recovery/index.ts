import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin = "https://streamrateapp.com";
const headers = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });
  if (req.headers.get("origin") !== allowedOrigin) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers });
  }

  try {
    const authorization = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Authentication service is not configured" }), { status: 503, headers });
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Sign in required" }), { status: 401, headers });
    }

    const { data: isAdmin, error: adminCheckError } = await caller.rpc("is_seen_admin");
    if (adminCheckError || isAdmin !== true || userData.user.email?.toLowerCase() !== "kagisosekete5@gmail.com") {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers });
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Enter a valid account email" }), { status: 400, headers });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${allowedOrigin}/auth` },
    });
    if (error || !data.properties?.action_link) {
      console.error("Recovery link generation failed", error?.message ?? "Missing action link");
      return new Response(JSON.stringify({ error: "Could not create a recovery link for that account" }), { status: 400, headers });
    }

    // The link is a short-lived bearer credential. Return it only to the
    // authenticated, explicitly allowlisted administrator and never log it.
    return new Response(JSON.stringify({ action_link: data.properties.action_link, expires_in_seconds: 3600 }), { status: 200, headers });
  } catch (error) {
    console.error("Admin recovery endpoint failed", error instanceof Error ? error.message : "unknown error");
    return new Response(JSON.stringify({ error: "Unable to create a recovery link" }), { status: 500, headers });
  }
});
