// src/lib/utm.ts
const STORAGE_KEY = "trk_params_v1";

const ALLOWED_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "aff_sub",
  "aff_sub2",
  "subid",
  "sub_id",
  "cid",
];

export function captureInitialUTMOnce() {
  try {
    if (typeof window === "undefined") return;
    const qs = new URLSearchParams(window.location.search || "");
    const obj: Record<string, string> = {};
    for (const key of ALLOWED_KEYS) {
      const v = qs.get(key);
      if (v) obj[key] = v;
    }
    if (Object.keys(obj).length === 0) return;
    const prev = getStoredTrackingParams();
    const merged = { ...prev, ...obj };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* ignore */ }
}

export function getStoredTrackingParams(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj as Record<string, string>;
    return {};
  } catch { return {}; }
}

export function appendStoredParams(url: string): string {
  try {
    const params = getStoredTrackingParams();
    if (!params || Object.keys(params).length === 0) return url;
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined);
    const q = u.searchParams;
    for (const [k, v] of Object.entries(params)) {
      if (!q.has(k)) q.set(k, v);
    }
    u.search = q.toString();
    return u.toString();
  } catch { return url; }
}


