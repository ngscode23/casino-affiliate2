import type { NextRequest } from "next/server";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; error: "unauthorized" | "cron_secret_weak" };

function normalizeSecret(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isLikelyWeakSecret(secret: string): boolean {
  const lower = secret.toLowerCase();
  if (!secret) return true;
  if (secret.length < 32) return true;
  if (lower === "123" || lower === "password" || lower === "test" || lower === "secret") return true;
  return false;
}

export function requireCronSecret(request: NextRequest): CronAuthResult {
  const cronSecret = normalizeSecret(process.env.CRON_SECRET);
  const headerSecret = normalizeSecret(request.headers.get("x-cron-secret"));

  if (!cronSecret) {
    return { ok: false, status: 500, error: "cron_secret_weak" };
  }

  if (process.env.NODE_ENV === "production" && isLikelyWeakSecret(cronSecret)) {
    return { ok: false, status: 500, error: "cron_secret_weak" };
  }

  if (!headerSecret || headerSecret !== cronSecret) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  return { ok: true };
}

