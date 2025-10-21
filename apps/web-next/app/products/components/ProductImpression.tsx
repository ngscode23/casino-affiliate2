"use client"
import { useEffect } from "react";

export default function ProductImpression({
  productId,
  dataset,
}: {
  productId: string;
  dataset: "shop" | "legacy";
}) {
  useEffect(() => {
    if (!productId) return;
    const win = window as typeof window & {
      requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleHandle: number | null = null;

    const send = () => {
      fetch("/api/track/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, dataset }),
      }).catch(() => {});
    };

    if (typeof win.requestIdleCallback === "function") {
      idleHandle = win.requestIdleCallback(send, { timeout: 2000 });
    } else {
      timeoutId = setTimeout(send, 120);
    }

    return () => {
      if (idleHandle !== null) {
        win.cancelIdleCallback?.(idleHandle);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [productId, dataset]);
  return null;
}


