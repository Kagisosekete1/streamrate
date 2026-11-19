import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Completes OAuth and password-recovery links after Android returns from the
 * system browser. Web sign-in keeps using the normal browser redirect flow.
 */
export function NativeAuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Android can deliver the same cold-start deep link through both
    // getLaunchUrl() and appUrlOpen. Exchanging a PKCE code twice makes the
    // second exchange fail and used to send a successful sign-in back to /auth.
    const handledCallbacks = new Set<string>();
    const finishAuth = async (url: string) => {
      if (!url.startsWith("com.semogrouptech.streamrateapp://auth/")) return;
      if (handledCallbacks.has(url)) return;
      handledCallbacks.add(url);

      try {
        const callback = new URL(url);
        const query = callback.searchParams;
        const hash = new URLSearchParams(callback.hash.replace(/^#/, ""));
        const isRecovery = query.get("type") === "recovery" || hash.get("type") === "recovery";

        const providerError = query.get("error_description") || query.get("error") || hash.get("error_description") || hash.get("error");
        if (providerError) {
          navigate(`/auth?error=${encodeURIComponent(providerError)}`, { replace: true });
          return;
        }

        const code = query.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (error) throw error;
          } else {
            throw new Error("Google returned to the app without an authorization code or session tokens.");
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("The sign-in completed, but Supabase did not save a session. Please try again.");
        navigate(isRecovery ? "/auth?recovery=1" : "/home", { replace: true });
      } catch (error) {
        console.error("Native authentication callback failed", error);
        const message = error instanceof Error ? error.message : "Unable to finish sign-in";
        navigate(`/auth?error=${encodeURIComponent(message)}`, { replace: true });
      } finally {
        await Browser.close();
      }
    };

    let listener: { remove: () => Promise<void> } | undefined;
    CapacitorApp.addListener("appUrlOpen", ({ url }) => finishAuth(url)).then((handle) => {
      listener = handle;
    });
    CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) finishAuth(launch.url);
    });

    return () => {
      listener?.remove();
    };
  }, [navigate]);

  return null;
}
