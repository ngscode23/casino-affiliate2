"use client";;
import { sectionTitle, mutedTextXs, mutedTextSm } from "@/styles/classnames";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import ProductCard, { type ProductGridItem } from "@/components/ProductCard";
import { ProductSkeleton } from "@/components/ProductGrid";
import { useMaybeI18n } from "@shared/lib/i18n";
import { t as translateKey, type Lang } from "@shared/lib/t";
import { cn } from "@shared/lib/cn";
import { isRecsOptedOut, logRecEvent, setRecsOptOut } from "@/lib/recs-events";

type ApiRecProduct = {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
  meta?: string | null;
  price?: string | null;
  price_cents?: number | null;
  rating?: number | null;
  image?: string | null;
  category?: string | null;
};

type ApiRec = {
  product_id: string | null;
  reason: string | null;
  score: number | null;
  adjusted_score?: number | null;
  treatment?: string | null;
  rank?: number | null;
  bandit?: { from_rank?: number | null; rollout?: number | null } | null;
  product?: ApiRecProduct | null;
};

type State = {
  loading: boolean;
  items: ApiRec[];
  treatment: string | null;
  optOut: boolean;
};

function buildGridItem(rec: ApiRec): ProductGridItem | null {
  const product = rec.product;
  if (!product || (!product.slug && !product.id)) return null;
  return {
    id: product.id ?? rec.product_id ?? product.slug ?? "",
    slug: product.slug ?? product.id ?? rec.product_id ?? "",
    title: product.title ?? "Product",
    subtitle: product.rating ? `⭐ ${Number(product.rating).toFixed(1)}` : undefined,
    price: product.price ?? null,
    meta: rec.reason ?? product.meta ?? null,
    image: product.image ?? undefined,
  };
}

export function RecommendationsWidget({ limit = 8 }: { limit?: number }) {
  const i18n = useMaybeI18n();
  const lang = (i18n?.lang ?? "en") as Lang;
  const translate = useCallback(
    (key: string, fallback: string) => {
      const value = translateKey(key, lang);
      return value && value !== key ? value : fallback;
    },
    [lang],
  );
  const addLabel = translate("products.addToCart", "Add to cart");
  const noImageLabel = translate("products.noImage", "No image");

  const [state, setState] = useState<State>(() => ({
    loading: true,
    items: [],
    treatment: null,
    optOut: isRecsOptedOut(),
  }));
  const impressions = useRef<Set<string>>(new Set());
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [navState, setNavState] = useState({ canScrollPrev: false, canScrollNext: false });

  useEffect(() => {
    if (state.optOut) {
      setState((prev) => ({ ...prev, loading: false, items: [] }));
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/recs?limit=${limit}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        const json = (await res.json().catch(() => ({}))) as { recommendations?: ApiRec[]; treatment?: string | null };
        if (!controller.signal.aborted) {
          setState({
            loading: false,
            items: Array.isArray(json.recommendations) ? json.recommendations : [],
            treatment: json.treatment ?? null,
            optOut: false,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState((prev) => ({ ...prev, loading: false, items: [], treatment: null }));
        }
      }
    })();
    return () => controller.abort();
  }, [limit, state.optOut]);

  const gridItems = useMemo(
    () =>
      state.items
        .map((rec) => {
          const item = buildGridItem(rec);
          return item ? { rec, item } : null;
        })
        .filter(Boolean) as Array<{ rec: ApiRec; item: ProductGridItem }>,
    [state.items],
  );

  // Fire impressions once per product/treatment combo
  useEffect(() => {
    if (!gridItems.length) return;
    const timer = setTimeout(() => {
      gridItems.forEach(({ rec }, idx) => {
        const key = `${rec.product_id ?? "unknown"}:${state.treatment ?? rec.treatment ?? "control"}`;
        if (impressions.current.has(key)) return;
        impressions.current.add(key);
        void logRecEvent({
          event: "impression",
          productId: rec.product_id ?? undefined,
          category: rec.product?.category ?? undefined,
          metadata: {
            reason: rec.reason,
            rank: rec.rank ?? idx + 1,
            score: rec.score,
            adjusted_score: rec.adjusted_score,
            treatment: rec.treatment ?? state.treatment ?? "control",
            bandit_from: rec.bandit?.from_rank ?? null,
            rollout: rec.bandit?.rollout ?? null,
          },
        });
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [gridItems, state.treatment]);

  const handleClick = useCallback(
    (rec: ApiRec, index: number) => {
      void logRecEvent({
        event: "click",
        productId: rec.product_id ?? undefined,
        category: rec.product?.category ?? undefined,
        metadata: {
          reason: rec.reason,
          rank: rec.rank ?? index + 1,
          score: rec.score,
          adjusted_score: rec.adjusted_score,
          treatment: rec.treatment ?? state.treatment ?? "control",
          bandit_from: rec.bandit?.from_rank ?? null,
          rollout: rec.bandit?.rollout ?? null,
        },
      });
    },
    [state.treatment],
  );

  const handleOptToggle = useCallback(
    (value: boolean) => {
      setRecsOptOut(value);
      setState((prev) => ({
        ...prev,
        optOut: value,
        items: value ? [] : prev.items,
        treatment: value ? null : prev.treatment,
      }));
    },
    [],
  );

  const updateNavState = useCallback(() => {
    const container = trackRef.current;
    if (!container) {
      setNavState({ canScrollPrev: false, canScrollNext: false });
      return;
    }
    const maxScroll = container.scrollWidth - container.clientWidth;
    setNavState({
      canScrollPrev: container.scrollLeft > 8,
      canScrollNext: maxScroll > 0 ? container.scrollLeft < maxScroll - 8 : false,
    });
  }, []);

  useEffect(() => {
    const container = trackRef.current;
    if (!container) {
      setNavState({ canScrollPrev: false, canScrollNext: false });
      return;
    }
    const handle = () => updateNavState();
    container.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle);
    handle();
    return () => {
      container.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [gridItems.length, updateNavState]);

  useEffect(() => {
    const container = trackRef.current;
    if (!container) return;
    container.scrollTo({ left: 0 });
    updateNavState();
  }, [gridItems.length, updateNavState]);

  const scrollCarousel = useCallback((direction: "prev" | "next") => {
    const container = trackRef.current;
    if (!container) return;
    const card = container.querySelector<HTMLElement>("[data-carousel-card]");
    const gap = 24;
    const delta = card ? card.offsetWidth + gap : container.clientWidth * 0.85;
    const target = container.scrollLeft + (direction === "next" ? delta : -delta);
    const start = container.scrollLeft;
    const distance = target - start;
    const duration = 700;
    let startTs: number | null = null;

    const step = (ts: number) => {
      if (startTs === null) startTs = ts;
      const elapsed = Math.min(1, (ts - startTs) / duration);
      const ease = 0.5 * (1 - Math.cos(Math.PI * elapsed)); // easeInOut
      container.scrollLeft = start + distance * ease;
      if (elapsed < 1) {
        requestAnimationFrame(step);
      } else {
        updateNavState();
      }
    };

    requestAnimationFrame(step);
  }, [updateNavState]);

  if (state.loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitle}>Recommended for you</h2>
          <span className={mutedTextXs}>loading</span>
        </div>
        <div
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 pr-1"
          role="list"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {Array.from({ length: Math.min(4, limit) }).map((_, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 basis-[85%] snap-start sm:basis-[45%] lg:basis-[30%]"
              role="listitem"
            >
              <ProductSkeleton />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (state.optOut) {
    return (
      <section className="space-y-3 rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg">Recommended for you</h2>
          <button
            type="button"
            onClick={() => handleOptToggle(false)}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Turn on
          </button>
        </div>
        <p className={mutedTextSm}>Personalization is off. Turn it on to see tailored picks.</p>
      </section>
    );
  }

  if (!gridItems.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={sectionTitle}>Recommended for you</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {state.treatment ? <span className="capitalize">variant: {state.treatment}</span> : null}
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={!state.optOut}
              onChange={(e) => handleOptToggle(!e.target.checked ? true : false)}
            />
            <span className="select-none">Personalization</span>
          </label>
        </div>
      </div>
      <div className="relative">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 pr-1 scroll-smooth"
          role="list"
          aria-roledescription="carousel"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {gridItems.map(({ rec, item }, index) => (
            <div
              key={item.slug || item.id}
              className="flex-shrink-0 basis-[85%] snap-start sm:basis-[45%] lg:basis-[30%] xl:basis-[25%]"
              role="listitem"
              data-carousel-card
              onClickCapture={() => handleClick(rec, index)}
            >
              <ProductCard
                product={item}
                index={index}
                href={`/products/${item.slug}`}
                showAddToCart
                addLabel={addLabel}
                noImageLabel={noImageLabel}
                translate={translate}
                variant="carousel"
              />
            </div>
          ))}
        </div>
        {gridItems.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous recommendations"
              onClick={() => scrollCarousel("prev")}
              disabled={!navState.canScrollPrev}
              className={cn(
                "pointer-events-none absolute left-0 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 p-2 text-fg shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex",
                navState.canScrollPrev ? "pointer-events-auto hover:bg-background" : "opacity-40",
              )}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next recommendations"
              onClick={() => scrollCarousel("next")}
              disabled={!navState.canScrollNext}
              className={cn(
                "pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 p-2 text-fg shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex",
                navState.canScrollNext ? "pointer-events-auto hover:bg-background" : "opacity-40",
              )}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}

