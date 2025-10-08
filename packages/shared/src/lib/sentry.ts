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

const env = typeof process !== "undefined" && process?.env ? process.env : {};

function pickEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function isDev(): boolean {
  const mode = pickEnv("NEXT_PUBLIC_APP_ENV", "APP_ENV", "NODE_ENV") ?? "";
  return mode.toLowerCase() === "development";
}

async function loadSentry(): Promise<typeof import("@sentry/react") | null> {
  try {
    const mod = await import("@sentry/react");
    Sentry = mod as unknown as SentryLike;
    return mod;
  } catch {
    if (isDev()) console.warn("[sentry] failed to import @sentry/react");
    return null;
  }
}

export async function initSentry(): Promise<boolean> {
  if (initialized) return true;
  const DSN = pickEnv("NEXT_PUBLIC_SENTRY_DSN", "SENTRY_DSN");
  if (!DSN) return false;
  const consent = getConsent();
  if (!consent?.analytics) return false;

  try {
    const mod = await loadSentry();
    if (!mod) return false;
    const release = pickEnv("NEXT_PUBLIC_SENTRY_RELEASE", "SENTRY_RELEASE");
    const environment = pickEnv("NEXT_PUBLIC_APP_ENV", "APP_ENV", "NODE_ENV") ?? "production";
    mod.init({
      dsn: DSN,
      environment,
      release,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.0,
      replaysOnErrorSampleRate: 1.0,
    });
    initialized = true;
    return true;
  } catch (error) {
    if (isDev()) console.warn("[sentry.init] failed:", error);
    return false;
  }
}

// Optional helper to auto-init on consent change (call once in app entry)
export function bindSentryToConsent(): () => void {
  return onConsentChanged(() => { if (!initialized) void initSentry(); });
}

export function isSentryInitialized() { return initialized; }

export { Sentry };
