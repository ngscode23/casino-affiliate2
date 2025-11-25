"use client";
import { useEffect } from "react";
import { track } from "@/lib/track";

export default function ProductImpression({
  productId,
  dataset,
  category,
  priceBucket,
}: {
  productId: string;
  dataset: "shop" | "legacy";
  category?: string | null;
  priceBucket?: string | null;
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
      track({
        event: "product_impression",
        productId,
        category: category ?? dataset,
        priceBucket: priceBucket ?? undefined,
      });
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
  }, [productId, dataset, category, priceBucket]);
  return null;
}


