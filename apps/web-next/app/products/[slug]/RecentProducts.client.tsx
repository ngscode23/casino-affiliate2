"use client";

import { useEffect, useState } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import type { ProductGridItem } from "@/components/ProductGrid";

type RecentProductsProps = {
  currentSlug: string;
};

type RecentProductsState = { loading: boolean; items: ProductGridItem[] };

const RECENT_KEY = "recent:products:v1";

function getRecentSlugs(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export default function RecentProducts({ currentSlug }: RecentProductsProps) {
  const [{ loading, items }, setState] = useState<RecentProductsState>(() => ({ loading: true, items: [] }));

  useEffect(() => {
    const list = getRecentSlugs().filter((slug) => slug !== currentSlug);
    if (!list.length) {
      setState({ loading: false, items: [] });
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const url = new URL("/api/products/lookup", window.location.origin);
        url.searchParams.set("slugs", list.join(","));
        url.searchParams.set("limit", "8");
        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed to load recently viewed");
        const json = (await res.json()) as { ok: boolean; items: ProductGridItem[] };
        if (controller.signal.aborted) return;
        setState({ loading: false, items: Array.isArray(json.items) ? json.items : [] });
      } catch {
        if (!controller.signal.aborted) setState({ loading: false, items: [] });
      }
    })();
    return () => controller.abort();
  }, [currentSlug]);

  if (loading || items.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-fg">Вы недавно смотрели</h2>
      <ProductGrid items={items} wrapWithContainer={false} />
    </section>
  );
}
