// src/lib/sentry.ts
import React from "react";
import { getConsent, onConsentChanged } from "@shared/lib/consent";

// Lightweight fallback Sentry-like export to avoid bundling @sentry/react
type SentryLike = {
  ErrorBoundary: React.ComponentType<{ fallback: React.ReactNode; children?: React.ReactNode }>;
  init?: (cfg: any) => void;
};

let Sentry: SentryLike = {
  ErrorBoundary: ({ children }) => (children as any),
};

let initialized = false;

async function loadSentry(): Promise<typeof import("@sentry/react") | null> {
  try {
    const mod = await import("@sentry/react");

    Sentry = mod as unknown as SentryLike;
    return mod;
  } catch {
    return null;
  }
}

export async function initSentry(): Promise<boolean> {
  if (initialized) return true;
  const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!DSN) return false;
  const consent = getConsent();
  if (!consent?.analytics) return false;

  try {
    const mod = await loadSentry();
    if (!mod) return false;
    const release = import.meta.env.VITE_SENTRY_RELEASE as string | undefined;
    mod.init({
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
  return onConsentChanged(() => { if (!initialized) void initSentry(); });
}

export function isSentryInitialized() { return initialized; }

export { Sentry };

