"use client";

type RecEvent =
  | "view"
  | "click"
  | "impression"
  | "add_to_cart"
  | "purchase"
  | "search";

export type RecEventPayload = {
  event: RecEvent;
  productId?: string | null;
  category?: string | null;
  priceCents?: number | null;
  weight?: number | null;
  metadata?: Record<string, unknown> | null;
};

const ENDPOINT = "/api/recs";
const TREATMENT_COOKIE = "recs_treatment";
const OPT_OUT_KEY = "recs_opt_out";

function readTreatmentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TREATMENT_COOKIE}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(TREATMENT_COOKIE.length + 1));
  } catch {
    return null;
  }
}

function normalizeNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function isRecsOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(OPT_OUT_KEY);
    return stored === "1" || stored === "true";
  } catch {
    return false;
  }
}

export function setRecsOptOut(flag: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OPT_OUT_KEY, flag ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function buildPayload(input: RecEventPayload): Record<string, unknown> {
  const base: Record<string, unknown> = {
    event: input.event,
  };

  if (input.productId) base.productId = input.productId;
  if (input.category) base.category = input.category;

  const price = normalizeNumber(input.priceCents);
  if (price != null) base.priceCents = Math.round(price);

  const weight = normalizeNumber(input.weight);
  if (weight != null && weight > 0) base.weight = weight;

  const treatment = input.metadata?.treatment ?? readTreatmentCookie();
  const metadata = { ...(input.metadata ?? {}) };
  if (treatment && typeof metadata.treatment !== "string") {
    metadata.treatment = treatment;
  }
  if (Object.keys(metadata).length) {
    base.metadata = metadata;
  }

  return base;
}

async function send(body: Record<string, unknown>): Promise<boolean> {
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    try {
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(body)], { type: "application/json" }));
      if (ok) return true;
    } catch {
      /* fall back to fetch */
    }
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (res.status === 403) {
      try {
        const payload = (await res.json()) as { opt_out?: boolean };
        if (payload?.opt_out) setRecsOptOut(true);
      } catch {
        /* ignore parse errors */
      }
      return true;
    }
    return res.ok;
  } catch {
    return false;
  }
}

export async function logRecEvent(payload: RecEventPayload): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isRecsOptedOut()) return true;
  if (!payload?.event) return false;
  const body = buildPayload(payload);
  return send(body);
}

export function useRecLogger() {
  return {
    log: (payload: RecEventPayload) => {
      void logRecEvent(payload);
    },
  };
}
