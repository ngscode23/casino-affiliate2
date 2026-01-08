"use client";;
import { sectionTitle, mutedTextSm } from "@/styles/classnames";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import ProductCard, { type ProductGridItem } from "@/components/ProductCard";
import { ProductSkeleton } from "@/components/ProductGrid";
import { useMaybeI18n } from "@shared/lib/i18n";
import { t as translateKey, type Lang } from "@shared/lib/t";
import { cn } from "@shared/lib/cn";
import { isRecsOptedOut, logRecEvent, setRecsOptOut } from "@/lib/recs-events";
import { AsyncSection } from "@/components/ui/AsyncSection";

type ApiRecItem = ProductGridItem & {
  score?: number | null;
  reason?: string | null;
  is_featured?: boolean;
  category_slug?: string | null;
};

type State = {
  loading: boolean;
  items: ApiRecItem[];
  optOut: boolean;
  error: string | null;
  personalizationEnabled: boolean;
};

function buildGridItem(rec: ApiRecItem): ProductGridItem | null {
  if (!rec || (!rec.slug && !rec.id)) return null;
  return {
    id: rec.id ?? rec.slug ?? "",
    slug: rec.slug ?? rec.id ?? "",
    title: rec.title ?? "Product",
    subtitle: rec.subtitle ?? undefined,
    price: rec.price ?? null,
    meta: rec.meta ?? null,
    image: rec.image ?? undefined,
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
    optOut: isRecsOptedOut(),
    error: null,
    personalizationEnabled: false,
  }));
  const [isSavingOptOut, setIsSavingOptOut] = useState(false);
  const [profileSynced, setProfileSynced] = useState(false);
  const impressions = useRef<Set<string>>(new Set());
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [navState, setNavState] = useState({ canScrollPrev: false, canScrollNext: false });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    (async () => {
      try {
        const res = await fetch("/api/profile", {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        const json = (await res.json().catch(() => ({}))) as { opt_out?: boolean };
        if (!active || controller.signal.aborted) return;
        const optOut = json.opt_out;
        if (res.ok && typeof optOut === "boolean") {
          setRecsOptOut(optOut);
          setState((prev) => ({ ...prev, optOut }));
        }
      } catch {
        // ignore profile sync errors
      } finally {
        if (active && !controller.signal.aborted) {
          setProfileSynced(true);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!profileSynced) return;
    if (state.optOut) {
      setState((prev) => ({ ...prev, loading: false, items: [], error: null, personalizationEnabled: false }));
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const res = await fetch(`/api/recs?limit=${limit}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        const json = (await res.json().catch(() => ({}))) as {
          items?: ApiRecItem[];
          recommendations?: ApiRecItem[];
          personalization?: { enabled?: boolean };
          opt_out?: boolean;
          error?: string | null;
          message?: string | null;
        };
        if (!controller.signal.aborted) {
          if (res.status === 403 || json.opt_out) {
            setRecsOptOut(true);
            setState({
              loading: false,
              items: [],
              optOut: true,
              error: null,
              personalizationEnabled: false,
            });
            return;
          }
          if (!res.ok) {
            const message = json.error || json.message || res.statusText || "Failed to load recommendations.";
            throw new Error(message);
          }
          const items = Array.isArray(json.items)
            ? json.items
            : Array.isArray(json.recommendations)
              ? json.recommendations
              : [];
          setState({
            loading: false,
            items,
            optOut: false,
            error: null,
            personalizationEnabled: Boolean(json.personalization?.enabled),
          });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : "Failed to load recommendations.";
          setState((prev) => ({
            ...prev,
            loading: false,
            items: [],
            error: message || null,
            personalizationEnabled: false,
          }));
        }
      }
    })();
    return () => controller.abort();
  }, [limit, state.optOut, profileSynced]);

  const gridItems = useMemo(
    () =>
      state.items
        .map((rec) => {
          const item = buildGridItem(rec);
          return item ? { rec, item } : null;
        })
        .filter(Boolean) as Array<{ rec: ApiRecItem; item: ProductGridItem }>,
    [state.items],
  );

  // Fire impressions once per product/reason combo
  useEffect(() => {
    if (!gridItems.length) return;
    const timer = setTimeout(() => {
      gridItems.forEach(({ rec }, idx) => {
        const key = `${rec.id ?? "unknown"}:${rec.reason ?? "default"}`;
        if (impressions.current.has(key)) return;
        impressions.current.add(key);
        void logRecEvent({
          event: "impression",
          productId: rec.id ?? undefined,
          category: rec.category_slug ?? undefined,
          metadata: {
            reason: rec.reason,
            rank: idx + 1,
            score: rec.score,
            featured: rec.is_featured ?? false,
          },
        });
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [gridItems]);

  const handleClick = useCallback(
    (rec: ApiRecItem, index: number) => {
      void logRecEvent({
        event: "click",
        productId: rec.id ?? undefined,
        category: rec.category_slug ?? undefined,
        metadata: {
          reason: rec.reason,
          rank: index + 1,
          score: rec.score,
          featured: rec.is_featured ?? false,
        },
      });
    },
    [],
  );

  const handleOptToggle = useCallback(
    async (value: boolean) => {
      if (isSavingOptOut) return;
      setIsSavingOptOut(true);
      try {
        const res = await fetch("/api/profile", {
          method: value ? "DELETE" : "POST",
          headers: { accept: "application/json" },
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (!res.ok) {
          const message = json.error || json.message || res.statusText || "Unable to update personalization.";
          throw new Error(message);
        }
        setRecsOptOut(value);
        setState((prev) => ({
          ...prev,
          loading: !value,
          items: [],
          optOut: value,
          error: null,
          personalizationEnabled: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to update personalization.";
        setState((prev) => ({ ...prev, error: message || prev.error }));
      } finally {
        setIsSavingOptOut(false);
      }
    },
    [isSavingOptOut],
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

  if (state.optOut) {
    return (
      <section className="space-y-3 rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg">Recommended for you</h2>
          <button
            type="button"
            onClick={() => handleOptToggle(false)}
            disabled={isSavingOptOut}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Turn on
          </button>
        </div>
        <p className={mutedTextSm}>Personalization is off. Turn it on to see tailored picks.</p>
      </section>
    );
  }

  const status = state.loading ? "loading" : state.error ? "error" : "success";

  const skeleton = (
    <div
      className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 pr-1 scroll-smooth"
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
  );

  const errorFallback = (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      {state.error ?? "Не удалось загрузить рекомендации."}
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={sectionTitle}>Recommended for you</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={!state.optOut}
              disabled={isSavingOptOut}
              onChange={(e) => handleOptToggle(!e.target.checked ? true : false)}
            />
            <span className="select-none">Personalization</span>
          </label>
        </div>
      </div>
      <AsyncSection status={status} skeleton={skeleton} errorFallback={errorFallback}>
        {!gridItems.length ? (
          <p className={mutedTextSm}>No recommendations yet.</p>
        ) : (
          <div className="relative">
            <div
              ref={trackRef}
              className="hide-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 pr-1 scroll-smooth"
              role="list"
              aria-roledescription="carousel"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {gridItems.map(({ rec, item }, index) => {
                const isFeatured = Boolean(rec.is_featured && index === 0);
                const cardClass = isFeatured
                  ? "basis-[95%] sm:basis-[70%] lg:basis-[45%] xl:basis-[38%]"
                  : "basis-[85%] sm:basis-[45%] lg:basis-[30%] xl:basis-[25%]";
                const featuredStyle: CSSProperties | undefined = isFeatured
                  ? ({
                      "--vc-card-width": "420px",
                      "--vc-card-radius": "28px",
                      "--vc-card-image-radius": "16px",
                    } as CSSProperties)
                  : undefined;
                return (
                  <div
                    key={item.slug || item.id}
                    className={cn("flex-shrink-0 snap-start", cardClass)}
                    style={featuredStyle}
                    role="listitem"
                    data-carousel-card
                    onClickCapture={() => handleClick(rec, index)}
                  >
                    {rec.reason ? (
                      <p className="mb-2 text-xs font-medium text-muted-foreground">{rec.reason}</p>
                    ) : null}
                    <ProductCard
                      product={item}
                      index={index}
                      href={`/products/${item.slug}`}
                      showAddToCart
                      addLabel={addLabel}
                      noImageLabel={noImageLabel}
                      translate={translate}
                      variant={isFeatured ? "default" : "carousel"}
                    />
                  </div>
                );
              })}
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
        )}
      </AsyncSection>
    </section>
  );
}

