import OneSignal from "@onesignal/capacitor-plugin";
import { Capacitor } from "@capacitor/core";

// Public OneSignal application ID. This must match the ID used by the push
// dispatch Edge Function and the web SDK configuration.
export const ONESIGNAL_APP_ID = "447ab0ac-d32a-4aa8-bb29-d4b50c562672";

let initialization: Promise<void> | null = null;

export const initializeNativeOneSignal = async () => {
  if (!Capacitor.isNativePlatform()) return;
  initialization ??= OneSignal.initialize(ONESIGNAL_APP_ID);
  await initialization;
};

export const getPushPermissionState = async (): Promise<"default" | "granted" | "denied" | "unsupported"> => {
  if (Capacitor.isNativePlatform()) {
    await initializeNativeOneSignal();
    if (await OneSignal.Notifications.hasPermission()) return "granted";
    return (await OneSignal.Notifications.canRequestPermission()) ? "default" : "denied";
  }
  // StreamRate sends push notifications to Android only. Browser notifications
  // are intentionally disabled to avoid duplicate or misleading prompts.
  return "unsupported";
};

export const requestPushPermission = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    await initializeNativeOneSignal();
    return OneSignal.Notifications.requestPermission(false);
  }
  return false;
};
