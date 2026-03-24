import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export const useNativePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const shownLiveToastIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (permission !== "granted") return;

      try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          ...options,
        });
      } catch (error) {
        // Fallback to regular Notification
        new Notification(title, {
          icon: "/pwa-192x192.png",
          ...options,
        });
      }
    },
    [permission]
  );

  // Listen for in-app notifications from Supabase and show browser notifications
  useEffect(() => {
    if (!user || permission !== "granted") return;

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
            from_user_id?: string;
          };

          // Check if go-live notifications are disabled
          const notifPrefs = JSON.parse(localStorage.getItem("notification_prefs") || "{}");
          if (notification.type === "go_live" && notifPrefs.goLive === false) {
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
                      const targetPath = notification.from_user_id ? `/streamer/${notification.from_user_id}` : "/live";
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

          showNotification(notification.title, {
            body: notification.message,
            tag: notification.type,
            data: {
              postId: notification.post_id,
              reelId: notification.reel_id,
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permission, showNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
  };
};
