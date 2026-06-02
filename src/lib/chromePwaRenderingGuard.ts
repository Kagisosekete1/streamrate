const CHROME_ANDROID_PWA_CLASS = "chrome-android-pwa";
const LOW_END_DEVICE_CLASS = "low-end-device";
const NO_BACKDROP_BLUR_CLASS = "no-backdrop-blur";

const isStandaloneDisplay = () => {
  if (typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const navigatorStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(standaloneMedia || navigatorStandalone);
};

const isChromeAndroid = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua) && /Chrome\/|CriOS\//i.test(ua) && !/EdgA|OPR|SamsungBrowser/i.test(ua);
};

const isLowEndDevice = () => {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const lowCores = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
  const dataSaver = Boolean(nav.connection?.saveData);
  const slowNetwork = /(^|-)2g$|(^|-)3g$/i.test(nav.connection?.effectiveType || "");
  return Boolean(lowMemory || lowCores || dataSaver || slowNetwork);
};

export const applyChromePwaRenderingGuards = () => {
  if (typeof document === "undefined") return;

  const chromeAndroidPwa = isChromeAndroid() && isStandaloneDisplay();
  const lowEndDevice = isLowEndDevice();

  document.documentElement.classList.toggle(CHROME_ANDROID_PWA_CLASS, chromeAndroidPwa);
  document.body.classList.toggle(CHROME_ANDROID_PWA_CLASS, chromeAndroidPwa);
  document.documentElement.classList.toggle(LOW_END_DEVICE_CLASS, lowEndDevice);
  document.body.classList.toggle(LOW_END_DEVICE_CLASS, lowEndDevice);

  const shouldDisableBlur = chromeAndroidPwa || lowEndDevice;
  document.documentElement.classList.toggle(NO_BACKDROP_BLUR_CLASS, shouldDisableBlur);
  document.body.classList.toggle(NO_BACKDROP_BLUR_CLASS, shouldDisableBlur);
};

export const shouldDisableBackdropBlurForDevice = () => isChromeAndroid() && isStandaloneDisplay() || isLowEndDevice();