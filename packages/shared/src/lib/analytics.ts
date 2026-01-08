// src/lib/analytics.ts
// Keep initial bundle light: load analytics libraries only after consent

/* ------------------ Window typings ------------------ */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/* ------------------ Flags & consts ------------------ */
let inited = false;
let _analyticsEnabled = false;
let _gaReady = false;

import { envString, envFlag, isDevEnvironment } from "./env";

const IS_DEV = isDevEnvironment();

export const GA_ID: string = envString(
  [
    "NEXT_PUBLIC_GA_ID",
    "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    "GA_ID",
    "GA_MEASUREMENT_ID",
  ],
  ""
);

const FEATURE_POSTHOG = envFlag(
  ["NEXT_PUBLIC_FEATURE_POSTHOG", "FEATURE_POSTHOG"],
  false
);

const PH_KEY = envString(["NEXT_PUBLIC_POSTHOG_KEY", "POSTHOG_KEY"], "") || undefined;
const PH_HOST = envString(
  ["NEXT_PUBLIC_POSTHOG_HOST", "POSTHOG_HOST"],
  "https://app.posthog.com"
);

// Lazy-loaded PostHog instance
let posthogRef: (typeof import("posthog-js")['default']) | null = null;

export type ConsentState = { analytics: boolean; marketing: boolean };

const A_ATTR = "data-analytics-consent";
const M_ATTR = "data-marketing-consent";
const EVENT_NAME = "cookie-consent-changed";

/* ------------------ Init / enable ------------------ */

/** Initialize PostHog (called after consent) */
export function initAnalytics(): void {
  if (inited) return;
  if (!PH_KEY || !FEATURE_POSTHOG) {
    if (IS_DEV) console.warn("[analytics] PostHog disabled or key not set");
    inited = true; // mark to avoid repeated attempts
    return;
  }

  // Dynamically import posthog-js after consent
  (async () => {
    try {
      const mod = await import("posthog-js");
      posthogRef = mod.default;
      posthogRef.init(PH_KEY!, {
        api_host: PH_HOST,
        autocapture: true,
        capture_pageview: false,
        persistence: "localStorage",
      });
      if (IS_DEV) console.info("[analytics] PostHog initialized");
    } catch (e) {
      if (IS_DEV) console.warn("[analytics.init] posthog init failed:", e);
    } finally {
      inited = true;
    }
  })();
}

/** Enable analytics after user consent (CookieBar) */
export function enableAnalytics(): void {
  if (_analyticsEnabled) return;
  _analyticsEnabled = true;

  try {
    // Initialize PostHog lazily
    if (!inited && FEATURE_POSTHOG) initAnalytics();

    // Update GA consent, if gtag is present
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("consent", "update", { analytics_storage: "granted" });
    }

    if (IS_DEV) console.info("[analytics] Analytics enabled");
  } catch (e) {
    if (IS_DEV) console.warn("[enableAnalytics] error:", e);
  }
}

export function isAnalyticsEnabled(): boolean {
  return _analyticsEnabled;
}

/* ------------------ Consent helpers ------------------ */

export function getConsent(): ConsentState {
  try {
    const a = document.documentElement.getAttribute(A_ATTR);
    const m = document.documentElement.getAttribute(M_ATTR);
    return { analytics: a === "granted", marketing: m === "granted" };
  } catch {
    return { analytics: false, marketing: false };
  }
}

export function setConsent(analytics: boolean, marketing: boolean): void {
  try {
    document.documentElement.setAttribute(A_ATTR, analytics ? "granted" : "denied");
    document.documentElement.setAttribute(M_ATTR, marketing ? "granted" : "denied");
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { analytics, marketing } }));
  } catch (e) {
    if (IS_DEV) console.warn("[analytics.setConsent] error:", e);
  }
}

/** Subscribe to consent changes from CookieBar */
export function onConsentChanged(cb: (state: ConsentState) => void): () => void {
  const handler = () => cb(getConsent());
  window.addEventListener(EVENT_NAME, handler as EventListener);
  return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
}

/* ------------------ GA readiness ------------------ */

export function setGaReady(v: boolean): void { _gaReady = v; }
export function isGaReady(): boolean { return _gaReady; }

/* ------------------ Tracking ------------------ */

export type TrackPayload = {
  name: string;
  params?: Record<string, unknown>;
};

export function track(name: string, params?: Record<string, unknown>): void;
export function track(payload: TrackPayload): void;
export function track(nameOrPayload: string | TrackPayload, params?: Record<string, unknown>): void {
  try {
    const name = typeof nameOrPayload === "string" ? nameOrPayload : nameOrPayload?.name;
    const payload = typeof nameOrPayload === "string" ? (params ?? {}) : (nameOrPayload?.params ?? {});
    if (!name) return;

    // Skip if analytics disabled / no consent
    if (!_analyticsEnabled) {
      if (IS_DEV) console.debug("[track:skipped(disabled)]", name, payload);
      return;
    }

    // GA
    try {
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", name, payload);
      }
    } catch (e) {
      if (IS_DEV) console.warn("[analytics.gtag] error:", e);
    }

    // PostHog (if loaded)
    try {
      posthogRef?.capture?.(name, payload);
    } catch (e) {
      if (IS_DEV) console.warn("[analytics.posthog] error:", e);
    }

    if (IS_DEV) console.debug("[track]", name, payload);
  } catch (e) {
    if (IS_DEV) console.warn("[analytics.track] error:", e);
  }
}

export function trackPageview(path?: string): void {
  if (!_analyticsEnabled) {
    if (IS_DEV) console.debug("[pageview:skipped(disabled)]", path ?? location.pathname);
    return;
  }
  try {
    posthogRef?.capture?.("$pageview", { path: path ?? location.pathname });
    // also send to GA when present
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path: path ?? location.pathname });
    }
  } catch (e) {
    if (IS_DEV) console.warn("[analytics.pageview] error:", e);
  }
}

