// src/lib/analytics.ts
import posthog from "posthog-js";

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

export const GA_ID: string = (import.meta.env.VITE_GA_ID as string) ?? "";
const PH_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const PH_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://app.posthog.com";

export type ConsentState = { analytics: boolean; marketing: boolean };

const A_ATTR = "data-analytics-consent";
const M_ATTR = "data-marketing-consent";
const EVENT_NAME = "cookie-consent-changed";

/* ------------------ Init / enable ------------------ */

/** Одноразовая инициализация PostHog (без автотрекинга страниц) */
export function initAnalytics(): void {
  if (inited) return;
  if (!PH_KEY) {
    if (import.meta.env.DEV) console.warn("[analytics] VITE_POSTHOG_KEY not set");
    inited = true; // считаем инициализированным, чтобы не дёргать каждый раз
    return;
  }

  try {
    posthog.init(PH_KEY, {
      api_host: PH_HOST,
      autocapture: true,
      capture_pageview: false,
      persistence: "localStorage"
    });
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[analytics.init] posthog init failed:", e);
  }
  inited = true;
}

/** Включить аналитику после согласия пользователя (CookieBar) */
export function enableAnalytics(): void {
  if (_analyticsEnabled) return;
  _analyticsEnabled = true;

  try {
    // Инициализируем PostHog лениво
    if (!inited) initAnalytics();

    // Обновим GA consent, если подключён gtag
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("consent", "update", { analytics_storage: "granted" });
    }

    if (import.meta.env.DEV) console.info("[analytics] Analytics enabled");
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[enableAnalytics] error:", e);
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
    if (import.meta.env.DEV) console.warn("[analytics.setConsent] error:", e);
  }
}

/** Подписка на изменение consent из CookieBar */
export function onConsentChanged(cb: (state: ConsentState) => void): () => void {
  const handler = () => cb(getConsent());
  window.addEventListener(EVENT_NAME, handler as EventListener);
  return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
}

/* ------------------ GA readiness ------------------ */

export function setGaReady(v: boolean): void {
  _gaReady = v;
}
export function isGaReady(): boolean {
  return _gaReady;
}

/* ------------------ Tracking ------------------ */

export type TrackPayload = {
  name: string;
  params?: Record<string, unknown>;
};

// Перегрузки для удобства типов
export function track(name: string, params?: Record<string, unknown>): void;
export function track(payload: TrackPayload): void;
export function track(nameOrPayload: string | TrackPayload, params?: Record<string, unknown>): void {
  try {
    const name = typeof nameOrPayload === "string" ? nameOrPayload : nameOrPayload?.name;
    const payload = typeof nameOrPayload === "string" ? (params ?? {}) : (nameOrPayload?.params ?? {});
    if (!name) return;

    // Если пользователь не дал согласие/мы не включены — тихо выходим
    if (!_analyticsEnabled) {
      if (import.meta.env.DEV) console.debug("[track:skipped(disabled)]", name, payload);
      return;
    }

    // GA
    try {
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", name, payload);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[analytics.gtag] error:", e);
    }

    // PostHog
    try {
      posthog?.capture?.(name, payload);
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[analytics.posthog] error:", e);
    }

    if (import.meta.env.DEV) console.debug("[track]", name, payload);
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[analytics.track] error:", e);
  }
}

export function trackPageview(path?: string): void {
  if (!inited) initAnalytics();
  if (!_analyticsEnabled) {
    if (import.meta.env.DEV) console.debug("[pageview:skipped(disabled)]", path ?? location.pathname);
    return;
  }
  try {
    posthog.capture("$pageview", { path: path ?? location.pathname });
    // Дублируем в GA для симметрии (если кто-то ещё любит отчёты в GA)
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path: path ?? location.pathname });
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[analytics.pageview] error:", e);
  }
}

/* ------------------ Convenience ------------------ */

/** Быстрое событие клика по афф. ссылке */
export function trackAffiliateClick(offer_slug: string, position?: number): void {
  track("click_affiliate_link", { offer_slug, position });
}

/** Добавление к сравнению */
export function trackAddToCompare(offer_slug: string, position?: number): void {
  track("add_to_compare", { offer_slug, position });
}