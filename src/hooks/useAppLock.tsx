import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useAppLock = () => {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkLockStatus = useCallback(async () => {
    if (!user) {
      setIsLocked(false);
      setHasPin(false);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("app_lock_settings")
      .select("is_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    const enabled = data?.is_enabled === true;
    setHasPin(!!data);
    
    // Check if already unlocked this session
    const unlocked = sessionStorage.getItem("app_unlocked") === "true";
    setIsLocked(enabled && !unlocked);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    checkLockStatus();
  }, [checkLockStatus]);

  // Listen for app visibility changes to re-lock
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // Re-check if should lock when returning to app
        checkLockStatus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [checkLockStatus]);

  const unlock = useCallback(() => {
    setIsLocked(false);
    sessionStorage.setItem("app_unlocked", "true");
  }, []);

  return { isLocked, hasPin, loading, unlock, checkLockStatus };
};
