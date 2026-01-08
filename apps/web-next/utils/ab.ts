"use client";

import React from "react";
export type AbVariant = "A" | "B";
export type AbEvent = "view" | "click" | string;

export function useClientVariant(testKey: string): AbVariant {
  const [v, setV] = React.useState<AbVariant>("A");
  React.useEffect(() => {
    const m = document.cookie.match(new RegExp(`(?:^|; )ab:${testKey}=([^;]+)`));
    setV(m?.[1] === "B" ? "B" : "A");
  }, [testKey]);
  return v;
}

export function trackAb(
  testKey: string,
  variant: AbVariant,
  event: AbEvent,
  props: Record<string, unknown> = {}
) {
  const payload = JSON.stringify({ test: testKey, variant, event, props, ts: Date.now(), href: location.href });
  const url = "/api/ab/track";
  try {
    if ("sendBeacon" in navigator) {
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
      return;
    }
  } catch {
  /* no-op */
}
  void fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
}
