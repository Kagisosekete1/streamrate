import OneSignal from "react-onesignal";

const ONESIGNAL_APP_ID = "af56c3a2-740c-45c3-a95b-af51cda2bfcd";

let initialized = false;

export const initOneSignal = async () => {
  if (initialized) return;
  
  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: {
        scope: "/onesignal/",
      },
      serviceWorkerPath: "/onesignal/OneSignalSDKWorker.js",
    });
    
    initialized = true;
    console.log("OneSignal initialized successfully");
  } catch (error) {
    console.error("OneSignal initialization error:", error);
  }
};

export const setOneSignalExternalUserId = async (userId: string) => {
  try {
    // For Median.co native apps, use the Median bridge
    const median = (window as any).median || (window as any).gonative;
    if (median?.onesignal) {
      try {
        await median.onesignal.externalUserId?.set?.(userId);
        console.log("Median OneSignal externalUserId set:", userId);
      } catch (e) {
        console.log("Median externalUserId fallback:", e);
      }
      return;
    }
    // For web/PWA, try OneSignal Web SDK but don't crash if it fails
    if (initialized) {
      await OneSignal.login(userId);
      console.log("OneSignal external user ID set:", userId);
    }
  } catch (error) {
    // Silently fail - OneSignal web SDK may not be fully initialized
    console.log("OneSignal login skipped:", error);
  }
};

export const promptForPushNotifications = async () => {
  try {
    await OneSignal.Notifications.requestPermission();
    return OneSignal.Notifications.permission;
  } catch (error) {
    console.error("Error requesting push permission:", error);
    return false;
  }
};

export const getOneSignalPermission = () => {
  try {
    return OneSignal.Notifications.permission;
  } catch {
    return false;
  }
};

export { OneSignal };
