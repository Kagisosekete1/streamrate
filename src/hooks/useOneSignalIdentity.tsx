import { useEffect } from "react";
import { useAuth } from "./useAuth";

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

/**
 * Ties the signed-in user to their OneSignal push subscription via external_id
 * (= Supabase auth user.id). Once linked, our edge function can target the
 * user directly by include_aliases.external_id.
 */
export const useOneSignalIdentity = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        const currentExternalId = OneSignal?.User?.externalId;
        if (user?.id) {
          if (currentExternalId !== user.id) {
            await OneSignal.login(user.id);
          }
          // Ask for permission (no-op if already granted/denied).
          if (OneSignal?.Notifications?.permission === false) {
            try {
              await OneSignal.Notifications.requestPermission();
            } catch {
              /* user dismissed */
            }
          }
        } else if (currentExternalId) {
          await OneSignal.logout();
        }
      } catch (err) {
        console.warn("OneSignal identity sync failed", err);
      }
    });
  }, [user?.id]);
};
