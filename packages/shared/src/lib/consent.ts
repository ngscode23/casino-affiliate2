// src/lib/consent.ts
// Lightweight consent storage + dispatcher using localStorage

export type ConsentValue = {
  analytics: boolean;
  marketing?: boolean;
};

export const CONSENT_KEY = "cookie-consent-v1";
export const EVENT_CONSENT_CHANGED = "consent:changed"; // new name
export const EVENT_CONSENT_CHANGED_LEGACY = "cookie-consent-changed"; // backward compat

function setHtmlAttrs(c: ConsentValue) {
  try {
    document.documentElement.setAttribute(
      "data-analytics-consent",
      c.analytics ? "granted" : "denied",
    );
    document.documentElement.setAttribute(
      "data-marketing-consent",
      c.marketing ? "granted" : "denied",
    );
  } catch { /* noop */ }
}

export function getConsent(): ConsentValue | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.analytics !== "boolean") return null;
    return { analytics: !!parsed.analytics, marketing: !!parsed.marketing };
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch { /* noop */ }

  setHtmlAttrs(value);

  try {
    const detail = { detail: value } as any;
    window.dispatchEvent(new CustomEvent(EVENT_CONSENT_CHANGED, detail));
    // Fire legacy event for existing listeners
    window.dispatchEvent(new CustomEvent(EVENT_CONSENT_CHANGED_LEGACY, detail));
  } catch { /* noop */ }
}

export function applyStoredConsentToDom(): void {
  const v = getConsent();
  if (v) setHtmlAttrs(v);
}

export function onConsentChanged(cb: (value: ConsentValue) => void): () => void {
  const handler = (e: Event) => {
    try { cb((e as CustomEvent).detail as ConsentValue); } catch { /* noop */ }
  };
  window.addEventListener(EVENT_CONSENT_CHANGED, handler as EventListener);
  return () => window.removeEventListener(EVENT_CONSENT_CHANGED, handler as EventListener);
}

export function openConsent(): void {
  try {
    window.dispatchEvent(new CustomEvent('consent:open'));
  } catch { /* noop */ }
}

