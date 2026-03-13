import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useNativePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

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
          vibrate: [200, 100, 200],
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
            title: string;
            message: string;
            type: string;
            post_id?: string;
            reel_id?: string;
          };

          // Don't show if app is focused
          if (document.hasFocus()) return;

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
