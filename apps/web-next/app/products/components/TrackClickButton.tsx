"use client";
import { useState } from "react";
import { attachUtm } from "@shared/lib/utm";

export default function TrackClickButton({
  productId,
  dataset,
}: {
  productId: string
  dataset: "shop" | "legacy"
}) {
  const [loading, setLoading] = useState(false);

  function onClick() {
    if (loading) return;
    setLoading(true);
    const payload = attachUtm({ product_id: productId, dataset });

    const win = window as typeof window & {
      requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const send = async () => {
      try {
        await fetch("/api/track/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
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
      {loading ? "Tracking…" : "Track click"}
    </button>
  );
}

