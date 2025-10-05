"use client";
import { useState } from "react";

export default function TrackClickButton({
  productId,
  dataset,
}: {
  productId: string
  dataset: "shop" | "legacy"
}) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      await fetch("/api/track/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, dataset }),
      });
    } finally {
      setLoading(false);
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
