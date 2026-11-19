import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getNotificationRoute } from "@/lib/notificationDeepLinks";
import { Capacitor } from "@capacitor/core";
import OneSignal from "@onesignal/capacitor-plugin";
import { initializeNativeOneSignal } from "@/lib/oneSignal";

export const useNativePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const shownLiveToastIds = useRef<Set<string>>(new Set());
  const [nativePermissionGranted, setNativePermissionGranted] = useState(false);

  useEffect(() => {
    // Zyiro uses Android native push only. Browser notification APIs are
    // deliberately not initialized or requested.
    if (Capacitor.isNativePlatform()) {
      setIsSupported(true);
      let active = true;
      const handlePushClick = (event: any) => {
        const data = event?.notification?.additionalData ?? {};
        const suppliedUrl = typeof data.url === "string" ? data.url : null;
        let route = suppliedUrl ? getNotificationRoute({ ...data, url: suppliedUrl }) : getNotificationRoute({
          type: data.type,
          post_id: data.postId,
          reel_id: data.reelId,
          comment_id: data.commentId,
          from_user_id: data.fromUserId,
        });
        if (suppliedUrl) {
          try {
            const parsed = new URL(suppliedUrl, "https://streamrateapp.com");
            route = `${parsed.pathname}${parsed.search}${parsed.hash}`;
          } catch {
            // Keep the notification type route when the supplied URL is invalid.
          }
        }
        if (route?.startsWith("/")) window.location.assign(route);
      };
      initializeNativeOneSignal()
        .then(async () => {
          if (!active) return;
          OneSignal.Notifications.addEventListener("click", handlePushClick);
          setNativePermissionGranted(await OneSignal.Notifications.hasPermission());
        })
        .catch((error) => console.warn("Native OneSignal initialization failed", error));
      return () => {
        active = false;
        OneSignal.Notifications.removeEventListener("click", handlePushClick);
      };
    }
    setIsSupported(false);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      if (Capacitor.isNativePlatform()) {
        await initializeNativeOneSignal();
        const granted = await OneSignal.Notifications.requestPermission(false);
        setNativePermissionGranted(granted);
        return granted;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      // Native remote pushes are delivered by OneSignal. Avoid browser shade
      // notifications; in-app realtime alerts are shown as app toasts below.
      void title;
      void options;
    },
    []
  );

  // Listen for in-app notifications from Supabase. Push delivery is native Android only.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("push-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as {
            id: string;
            title: string;
            message: string;
            type: string;
            post_id?: string;
            reel_id?: string;
            comment_id?: string;
            from_user_id?: string;
          };

          // The OneSignal Edge Function delivers this same notification to
          // the native Android shade. Keep the realtime toast in-app only.
          if (Capacitor.isNativePlatform()) {
            if (document.hasFocus() && notification.type === "go_live" && !shownLiveToastIds.current.has(notification.id)) {
              shownLiveToastIds.current.add(notification.id);
              toast({
                title: notification.title,
                description: notification.message,
                action: (
                  <ToastAction altText="Watch now" onClick={() => window.location.assign(getNotificationRoute(notification))}>
                    Watch
                  </ToastAction>
                ),
              });
            }
            return;
          }

          if (document.hasFocus()) {
            if (notification.type === "go_live" && !shownLiveToastIds.current.has(notification.id)) {
              shownLiveToastIds.current.add(notification.id);
              toast({
                title: notification.title,
                description: notification.message,
                action: (
                  <ToastAction
                    altText="Watch now"
                    onClick={() => {
                      const targetPath = getNotificationRoute(notification);
                      window.location.assign(targetPath);
                    }}
                  >
                    Watch
                  </ToastAction>
                ),
              });
            }
            return;
          }

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    isSupported,
    permission: Capacitor.isNativePlatform() ? (nativePermissionGranted ? "granted" : "default") : "unsupported",
    requestPermission,
    showNotification,
  };
};
