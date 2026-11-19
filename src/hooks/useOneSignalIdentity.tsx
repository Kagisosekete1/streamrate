import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { Capacitor } from "@capacitor/core";
import OneSignal from "@onesignal/capacitor-plugin";
import { initializeNativeOneSignal } from "@/lib/oneSignal";

// OneSignal identity changes must be serialized. In particular, don't let the
// initial signed-out render race with Supabase restoring a saved session.
let nativeIdentityQueue: Promise<void> = Promise.resolve();
let syncedNativeIdentity: string | null | undefined;

/**
 * Ties the signed-in user to their OneSignal push subscription via external_id
 * (= Supabase auth user.id). Once linked, our edge function can target the
 * user directly by include_aliases.external_id.
 */
export const useOneSignalIdentity = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !Capacitor.isNativePlatform()) return;

    let active = true;
    const externalId = user?.id ?? null;
    nativeIdentityQueue = nativeIdentityQueue
      .catch(() => undefined)
      .then(async () => {
        if (!active || syncedNativeIdentity === externalId) return;
        await initializeNativeOneSignal();
        if (!active) return;
        if (externalId) await OneSignal.login(externalId);
        else await OneSignal.logout();
        syncedNativeIdentity = externalId;
      })
      .catch((err) => console.warn("OneSignal native identity sync failed", err));

    return () => { active = false; };
  }, [loading, user?.id]);
};
