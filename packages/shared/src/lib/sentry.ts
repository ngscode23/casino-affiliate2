// src/lib/sentry.ts
import React from "react";
import { getConsent, onConsentChanged } from "@shared/lib/consent";

// Lightweight fallback Sentry-like export to avoid bundling @sentry/react
type SentryLike = {
  ErrorBoundary: React.ComponentType<{ fallback: React.ReactNode; children?: React.ReactNode }>;
  init?: (cfg: any) => void;
};

const env = (() => {
  const fromImport = typeof import.meta !== "undefined" && (import.meta as any)?.env ? (import.meta as any).env : {};
  const fromProcess = typeof process !== "undefined" && process?.env ? process.env : {};
  return { ...fromProcess, ...fromImport } as Record<string, string | undefined>;
})();

const pickEnv = (...keys: string[]): string => {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

let Sentry: SentryLike = {
  ErrorBoundary: ({ children }) => (children as any),
};

let initialized = false;

async function loadSentry(): Promise<typeof import("@sentry/react") | null> {
  try {
    const mod = await import("@sentry/react");
    // Replace fallback with real Sentry module
    // @ts-expect-error: reassigning to widen type at runtime
    Sentry = mod as unknown as SentryLike;
    return mod;
  } catch {
    return null;
  }
}

export async function initSentry(): Promise<boolean> {
  if (initialized) return true;
  const dsn = pickEnv("NEXT_PUBLIC_SENTRY_DSN", "VITE_SENTRY_DSN", "SENTRY_DSN") || undefined;
  if (!dsn) return false;
  const consent = getConsent();
  if (!consent?.analytics) return false;

  try {
    const mod = await loadSentry();
    if (!mod) return false;
    const release =
      pickEnv("VITE_SENTRY_RELEASE", "NEXT_PUBLIC_SENTRY_RELEASE", "SENTRY_RELEASE") || undefined;
    mod.init({
      dsn,
      environment:
        pickEnv("MODE", "NEXT_PUBLIC_MODE", "NODE_ENV") ||
        (typeof process !== "undefined" ? process.env.NODE_ENV : undefined),
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


