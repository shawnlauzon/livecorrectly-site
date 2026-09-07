/** Shared GA4 event helper — safe to call even if gtag isn't loaded. */
export function track(name: string, params?: Record<string, unknown>) {
  try {
    const w = window as Window & {
      gtag?: (...args: unknown[]) => void;
      DEBUG_ANALYTICS?: boolean;
    };
    if (typeof w.gtag === "function") w.gtag("event", name, params ?? {});
    if (w.DEBUG_ANALYTICS) console.log("[track]", name, params ?? {});
  } catch {
    // Analytics should never break the UI
  }
}
