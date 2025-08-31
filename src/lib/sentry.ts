// src/lib/sentry.ts
import * as Sentry from "@sentry/react";
import { getConsent, onConsentChanged } from "@/lib/consent";

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;
  const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!DSN) return false;
  const consent = getConsent();
  if (!consent?.analytics) return false;

  try {
    const release = import.meta.env.VITE_SENTRY_RELEASE as string | undefined;
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.MODE,
      release,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.0,
      replaysOnErrorSampleRate: 1.0,
    });
    initialized = true;
    return true;
  } catch {
    return false;
  }
}

// Optional helper to auto-init on consent change (call once in app entry)
export function bindSentryToConsent(): () => void {
  return onConsentChanged(() => { if (!initialized) initSentry(); });
}

export function isSentryInitialized() { return initialized; }

export { Sentry };

