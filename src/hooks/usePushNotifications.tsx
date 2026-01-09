import { useEffect, useState } from "react";
import { PushNotifications, PushNotificationSchema, Token, PermissionStatus } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "./useAuth";

type PushPermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionState>("prompt");

  useEffect(() => {
    const checkSupport = async () => {
      if (Capacitor.isNativePlatform()) {
        setIsSupported(true);
        await initializePushNotifications();
      }
    };

    checkSupport();
  }, []);

  useEffect(() => {
    if (token && user) {
      savePushToken(token);
    }
  }, [token, user]);

  const initializePushNotifications = async () => {
    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();
      setPermissionStatus(permStatus.receive);

      if (permStatus.receive === "prompt") {
        const result = await PushNotifications.requestPermissions();
        setPermissionStatus(result.receive);
        
        if (result.receive !== "granted") {
          return;
        }
      } else if (permStatus.receive !== "granted") {
        return;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Listen for registration success
      PushNotifications.addListener("registration", (token: Token) => {
        console.log("Push registration success:", token.value);
        setToken(token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener("registrationError", (error) => {
        console.error("Push registration error:", error);
      });

      // Listen for push notifications received while app is in foreground
      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.log("Push notification received:", notification);
        }
      );

      // Listen for push notification action (when user taps notification)
      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (notification) => {
          console.log("Push notification action performed:", notification);
          // Handle navigation based on notification data
          const data = notification.notification.data;
          if (data?.postId) {
            window.location.href = `/post/${data.postId}`;
          }
        }
      );
    } catch (error) {
      console.error("Error initializing push notifications:", error);
    }
  };

  const savePushToken = async (pushToken: string) => {
    if (!user) return;

    try {
      // Store push token in user's profile or a dedicated table
      // For now, we'll store it in localStorage as a simple solution
      // In production, you'd want to save this to your database
      localStorage.setItem(`push_token_${user.id}`, pushToken);
      console.log("Push token saved for user:", user.id);
    } catch (error) {
      console.error("Error saving push token:", error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) return false;

    try {
      const result = await PushNotifications.requestPermissions();
      setPermissionStatus(result.receive);

      if (result.receive === "granted") {
        await PushNotifications.register();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error requesting push permission:", error);
      return false;
    }
  };

  return {
    isSupported,
    token,
    permissionStatus,
    requestPermission,
  };
};
