"use client";
import { useState } from "react";
import { attachUtm } from "@shared/lib/utm";
import { track } from "@/lib/track";

export default function TrackClickButton({
  productId,
  dataset,
  category,
}: {
  productId: string;
  dataset: "shop" | "legacy";
  category?: string | null;
}) {
  const [loading, setLoading] = useState(false);

  function onClick() {
    if (loading) return;
    setLoading(true);
    attachUtm({ product_id: productId, dataset });

    const win = window as typeof window & {
      requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const send = () => {
      track({
        event: "product_click",
        productId,
        category: category ?? dataset,
      });
      setLoading(false);
    };

    if (typeof win.requestIdleCallback === "function") {
      const handle = win.requestIdleCallback(send, { timeout: 2000 });
      setTimeout(() => {
        win.cancelIdleCallback?.(handle);
        send();
      }, 2100);
    } else {
      setTimeout(send, 50);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
      disabled={loading}
    >
      {loading ? "Tracking." : "Track click"}
    </button>
  );
}

