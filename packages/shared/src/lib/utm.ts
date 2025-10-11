export type UtmContext = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  referrer_host?: string | null;
  landing_path?: string | null;
  device?: string | null;
  lang?: string | null;
  session_id?: string | null;
  click_id?: string | null;
};

const COOKIE_NAME = "utm_ctx";
const COOKIE_TTL_DAYS = 30;

function parseHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.host || null;
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = encodeURIComponent(name) + "=";
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      const value = part.slice(prefix.length);
      try { return decodeURIComponent(value); } catch { return value; }
    }
  }
  return null;
}

function writeCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax`;
}

function genSessionId(): string {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
  ).toLowerCase();
}

export function ensureUtmContext(): UtmContext | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);

  const existingRaw = readCookie(COOKIE_NAME);
  let existing: UtmContext = {};
  try {
    existing = existingRaw ? (JSON.parse(existingRaw) as UtmContext) : {};
  } catch {
    existing = {};
  }

  const next: UtmContext = { ...existing };
  // Capture UTM from URL only if present
  const get = (k: string) => url.searchParams.get(k);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
  utmKeys.forEach((k) => {
    const v = get(k);
    if (v && v.trim()) (next as any)[k] = v.trim();
  });

  // Context
  if (!next.referrer) next.referrer = document.referrer || null;
  if (!next.referrer_host) next.referrer_host = parseHost(next.referrer);
  if (!next.landing_path) next.landing_path = window.location.pathname || "/";
  if (!next.device) next.device = /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
  if (!next.lang) next.lang = navigator.language || (navigator as any).userLanguage || null;
  if (!next.session_id) next.session_id = genSessionId();

  writeCookie(COOKIE_NAME, JSON.stringify(next), COOKIE_TTL_DAYS);
  return next;
}

export function getUtmContext(): UtmContext | null {
  const raw = readCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UtmContext;
  } catch {
    return null;
  }
}

export function attachUtm<T extends Record<string, any>>(base: T): T & { utm?: UtmContext } {
  const ctx = getUtmContext();
  if (!ctx) return base as any;
  return { ...base, utm: ctx } as any;
}

const PARAM_WHITELIST: Array<keyof UtmContext> = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "referrer",
  "referrer_host",
  "click_id",
  "session_id",
];

export function appendStoredParams(url: string): string {
  if (!/^https?:/i.test(url)) return url;
  const ctx = getUtmContext();
  if (!ctx) return url;
  try {
    const target = new URL(url);
    for (const key of PARAM_WHITELIST) {
      const value = ctx[key];
      if (value && !target.searchParams.has(key)) {
        target.searchParams.set(key, String(value));
      }
    }
    return target.toString();
  } catch {
    return url;
  }
}

