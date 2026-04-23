/**
 * Lightweight analytics event tracker.
 *
 * Sends events to whichever analytics layer is available on `window`
 * (Plausible, GA4 gtag, or generic dataLayer) and falls back to a console
 * log so events are visible during development. Safe to call from anywhere.
 */
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export const trackEvent = (event: string, props: AnalyticsProps = {}) => {
  if (typeof window === "undefined") return;

  try {
    const w = window as any;

    if (typeof w.plausible === "function") {
      w.plausible(event, { props });
    }

    if (typeof w.gtag === "function") {
      w.gtag("event", event, props);
    }

    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event, ...props });
    }

    // Always log so developers can confirm events fire even without a provider.
    // eslint-disable-next-line no-console
    console.info("[analytics]", event, props);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[analytics] failed to track", event, err);
  }
};