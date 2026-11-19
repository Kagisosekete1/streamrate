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

    const finishAuth = async (url: string) => {
      if (!url.startsWith("com.semogrouptech.streamrateapp://auth/")) return;

      try {
        const callback = new URL(url);
        const query = callback.searchParams;
        const hash = new URLSearchParams(callback.hash.replace(/^#/, ""));
        const isRecovery = query.get("type") === "recovery" || hash.get("type") === "recovery";

        if (query.get("error_description") || hash.get("error_description")) {
          navigate(`/auth?error=${encodeURIComponent(query.get("error_description") || hash.get("error_description") || "Authentication was cancelled")}`);
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
          }
        }

        navigate(isRecovery ? "/auth?recovery=1" : "/home", { replace: true });
      } catch (error) {
        console.error("Native authentication callback failed", error);
        navigate("/auth?error=Unable%20to%20finish%20sign-in", { replace: true });
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
