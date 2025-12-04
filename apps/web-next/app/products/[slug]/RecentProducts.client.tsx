"use client";
import { sectionTitle } from "@/styles/classnames";

import { useEffect, useRef, useState } from "react";

import { ProductGrid } from "@/components/ProductGrid";
import type { ProductGridItem } from "@/components/ProductGrid";
import ProductCard from "@/components/ProductCard";

type RecentProductsProps = {
  currentSlug: string;
};

type RecentProductsState = {
  loading: boolean;
  recent: ProductGridItem[];
  recommended: ProductGridItem[];
};

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

async function loadFallbackFromLocal(slugs: string[], signal: AbortSignal): Promise<ProductGridItem[]> {
  if (!slugs.length) return [];
  const url = new URL("/api/products/lookup", window.location.origin);
  url.searchParams.set("slugs", slugs.join(","));
  url.searchParams.set("limit", "8");
  const res = await fetch(url.toString(), {
    signal,
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to load products");
  const json = (await res.json()) as { ok?: boolean; items?: ProductGridItem[] };
  return Array.isArray(json.items) ? json.items : [];
}

async function fetchRecommendations(currentSlug: string, signal: AbortSignal) {
  const url = new URL("/api/recommendations/recent", window.location.origin);
  url.searchParams.set("limit", "8");
  url.searchParams.set("similarLimit", "8");
  if (currentSlug) url.searchParams.set("excludeSlug", currentSlug);
  const res = await fetch(url.toString(), {
    signal,
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to load recommendations");
  return (await res.json()) as {
    ok?: boolean;
    recent?: ProductGridItem[];
    recommended?: ProductGridItem[];
  };
}

export default function RecentProducts({ currentSlug }: RecentProductsProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [{ loading, recent, recommended }, setState] = useState<RecentProductsState>({
    loading: true,
    recent: [],
    recommended: [],
  });

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetchRecommendations(currentSlug, controller.signal);
        if (controller.signal.aborted) return;

        let recentItems = Array.isArray(response.recent) ? response.recent : [];
        const recommendedItems = Array.isArray(response.recommended) ? response.recommended : [];

        if (!recentItems.length) {
          const fallbackSlugs = getRecentSlugs().filter((slug) => slug !== currentSlug).slice(0, 8);
          if (fallbackSlugs.length) {
            try {
              recentItems = await loadFallbackFromLocal(fallbackSlugs, controller.signal);
            } catch {
              // ignore fallback failures
            }
          }
        }

        setState({ loading: false, recent: recentItems, recommended: recommendedItems });
      } catch {
        if (controller.signal.aborted) return;
        const fallbackSlugs = getRecentSlugs().filter((slug) => slug !== currentSlug).slice(0, 8);
        if (!fallbackSlugs.length) {
          setState({ loading: false, recent: [], recommended: [] });
          return;
        }
        try {
          const fallbackItems = await loadFallbackFromLocal(fallbackSlugs, controller.signal);
          if (!controller.signal.aborted) {
            setState({ loading: false, recent: fallbackItems, recommended: [] });
          }
        } catch {
          if (!controller.signal.aborted) {
            setState({ loading: false, recent: [], recommended: [] });
          }
        }
      }
    })();

    return () => controller.abort();
  }, [currentSlug]);

  const scrollBy = (delta: number) => {
    const el = railRef.current;
    if (!el) return;
    const start = el.scrollLeft;
    const target = start + delta;
    const distance = target - start;
    const duration = 700;
    let startTs: number | null = null;

    const step = (ts: number) => {
      if (startTs === null) startTs = ts;
      const elapsed = Math.min(1, (ts - startTs) / duration);
      const ease = 0.5 * (1 - Math.cos(Math.PI * elapsed)); // easeInOut
      el.scrollLeft = start + distance * ease;
      if (elapsed < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if (loading || (recent.length === 0 && recommended.length === 0)) return null;

  return (
    <section className="space-y-6">
      {recent.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionTitle}>Recently viewed</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollBy(-320)}
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-muted transition hover:border-border hover:text-fg sm:inline-flex"
                aria-label="Scroll left"
              >
                <span aria-hidden>‹</span>
              </button>
              <button
                type="button"
                onClick={() => scrollBy(320)}
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-muted transition hover:border-border hover:text-fg sm:inline-flex"
                aria-label="Scroll right"
              >
                <span aria-hidden>›</span>
              </button>
            </div>
          </div>
          <div className="overflow-hidden">
            <div
              ref={railRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-2 scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {recent.map((product, index) => (
                <div
                  key={product.slug || product.id}
                  className="w-[260px] flex-none snap-start"
                >
                  <ProductCard
                    product={product}
                    index={index}
                    href={`/products/${product.slug}`}
                    showAddToCart={false}
                    addLabel="Add to cart"
                    noImageLabel="No image"
                    translate={(_, fallback) => fallback}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {recommended.length > 0 ? (
        <div className="space-y-4">
          <h2 className={sectionTitle}>Inspired by your browsing</h2>
          <ProductGrid items={recommended} wrapWithContainer={false} />
        </div>
      ) : null}
    </section>
  );
}
