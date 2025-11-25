"use client";

export type TrackEventInput = {
  event: string;
  productId?: string;
  category?: string;
  priceBucket?: string;
  referrer?: string;
  ts?: number | string;
  transport?: "auto" | "beacon" | "fetch";
};

type InternalEvent = {
  event: string;
  product_id?: string;
  category?: string;
  price_bucket?: string;
  referrer?: string;
  device?: string;
  ts?: number | string;
};

const ENDPOINT = "/api/track";
const MAX_BATCH = 20;
const FLUSH_INTERVAL_MS = 1200;
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_REQUESTS = 8;

let queue: InternalEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let recentRequests: number[] = [];

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|iphone|ipod|android(?!.+tablet)/.test(ua)) return "mobile";
  if (/ipad|tablet|sm-t|kindle|playbook/.test(ua)) return "tablet";
  return "desktop";
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue("timer");
  }, FLUSH_INTERVAL_MS);
}

function allowRequest(): boolean {
  const now = Date.now();
  recentRequests = recentRequests.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recentRequests.length >= RATE_LIMIT_REQUESTS) return false;
  recentRequests.push(now);
  return true;
}

async function sendBatch(events: InternalEvent[], preferBeacon: boolean) {
  if (typeof navigator !== "undefined" && preferBeacon && "sendBeacon" in navigator) {
    try {
      const blob = new Blob([JSON.stringify({ events })], { type: "application/json" });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    } catch {
      // fall through to fetch
    }
  }

  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: preferBeacon,
    });
  } catch {
    // swallow network errors; caller may retry on next flush
  }
}

export async function flushQueue(reason: "timer" | "visibility" | "manual" | "unload" = "manual") {
  if (!queue.length) return;

  if (!allowRequest()) {
    // Try again shortly to respect rate limit
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushQueue("timer");
      }, RATE_LIMIT_WINDOW_MS / 2);
    }
    return;
  }

  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(batch.length);
  const preferBeacon = reason === "visibility" || reason === "unload";
  await sendBatch(batch, preferBeacon);

  if (queue.length) {
    scheduleFlush();
  }
}

export function track(event: TrackEventInput) {
  if (typeof window === "undefined") return;
  if (!event?.event?.trim()) return;

  const payload: InternalEvent = {
    event: event.event.trim(),
    product_id: event.productId,
    category: event.category,
    price_bucket: event.priceBucket,
    referrer: event.referrer ?? document.referrer ?? undefined,
    ts: event.ts ?? Date.now(),
    device: detectDevice(),
  };

  queue.push(payload);
  if (queue.length >= MAX_BATCH) {
    void flushQueue("manual");
  } else {
    scheduleFlush();
  }
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") {
        void flushQueue("visibility");
      }
    },
    { passive: true },
  );
  window.addEventListener(
    "pagehide",
    () => {
      void flushQueue("unload");
    },
    { capture: true },
  );
}
