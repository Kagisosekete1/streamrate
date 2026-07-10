// @ts-ignore - virtual module from vite-plugin-pwa
import { registerSW } from "virtual:pwa-register";

const isLovablePreviewHost = (hostname: string) =>
  hostname.startsWith("id-preview--") ||
  hostname.startsWith("preview--") ||
  hostname === "lovableproject.com" ||
  hostname.endsWith(".lovableproject.com") ||
  hostname === "lovableproject-dev.com" ||
  hostname.endsWith(".lovableproject-dev.com") ||
  hostname === "beta.lovable.dev" ||
  hostname.endsWith(".beta.lovable.dev");

const unregisterAppShellWorker = async () => {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => registration.active?.scriptURL.endsWith("/sw.js") || registration.scope === `${window.location.origin}/`)
      .map((registration) => registration.unregister()),
  );
};

const shouldRefuseRegistration = () => {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  if (isLovablePreviewHost(window.location.hostname)) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
};

export const registerAppServiceWorker = () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (shouldRefuseRegistration()) {
    unregisterAppShellWorker().catch(() => {});
    return;
  }

  registerSW({
    immediate: false,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent("streamrate:pwa-update-ready"));
    },
    onOfflineReady() {
      console.info("StreamRate is ready for offline use.");
    },
  });
};