"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LifeBuoy, RotateCcw, ShieldCheck } from "lucide-react";
import AddToCartButton from "@/app/products/components/AddToCartButton";
import ProductImpression from "@/app/products/components/ProductImpression";
import TrackClickButton from "@/app/products/components/TrackClickButton";
import ProductGallery from "@/components/ProductGallery";
import ProductStickyCTA from "@/components/ProductStickyCTA";
import ProductSpecs from "@/components/ProductSpecs";
import ProductReviews from "@/components/ProductReviews";
import { ProductGrid } from "@/components/ProductGrid";
import type { ProductGridItem } from "@/components/ProductGrid";
import type { ProductData, ProductVariantGroup, ProductVariantOption } from "./data";
import { formatCurrency } from "./data";
import { track } from "@shared/lib/analytics";
import { cn } from "@shared/lib/cn";

type AdminStats = {
  isAdmin: boolean;
  clicks: number;
  impressions: number;
};

type Breadcrumb = { name: string; href: string };

type ProductViewProps = {
  product: ProductData;
  breadcrumbs: Breadcrumb[];
  admin: AdminStats;
  similar: ProductGridItem[];
};

type SelectionState = Record<string, ProductVariantOption | undefined>;

const RECENT_KEY = "recent:products:v1";
const PAYMENT_METHODS = ["Visa", "Mastercard", "Apple Pay", "Stripe"];
const TRUST_POINTS = [
  { title: "14 дней на возврат", icon: <RotateCcw className="h-4 w-4" aria-hidden /> },
  { title: "Поддержка 24/7", icon: <LifeBuoy className="h-4 w-4" aria-hidden /> },
  { title: "Гарантия подлинности", icon: <ShieldCheck className="h-4 w-4" aria-hidden /> },
];

function buildInitialSelection(variants: ProductVariantGroup[]): SelectionState {
  const next: SelectionState = {};
  for (const group of variants) {
    const option = group.options.find((opt) => !opt.disabled) ?? group.options[0];
    next[group.id] = option;
  }
  return next;
}

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

function persistRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

function pushRecent(slug: string) {
  const list = getRecentSlugs().filter((value) => value !== slug);
  list.unshift(slug);
  persistRecent(list);
}

function formatVariantLabel(variants: ProductVariantGroup[], selection: SelectionState): string | null {
  if (!variants.length) return null;
  const parts = variants
    .map((group) => selection[group.id]?.label ?? group.options[0]?.label ?? "")
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function computePrice(product: ProductData, selection: SelectionState): { raw: number; formatted: string } {
  const delta = Object.values(selection).reduce((sum, option) => sum + (option?.priceDelta ?? 0), 0);
  const value = Number(product.price ?? 0) + delta;
  return { raw: value, formatted: formatCurrency(value, product.currency) };
}

function composeGallery(product: ProductData, selection: SelectionState): string[] {
  const extras = new Set(product.gallery);
  Object.values(selection).forEach((option) => {
    if (option?.image) extras.add(option.image);
  });
  return Array.from(extras);
}

function ProductClientEffects({ product }: { product: ProductData }) {
  useEffect(() => {
    try {
      track({ name: "view_item", params: { product_id: product.id, slug: product.slug, price: product.price } });
    } catch {
      /* noop */
    }
    pushRecent(product.slug);
  }, [product.id, product.slug, product.price]);
  return null;
}

type RecentProductsState = { loading: boolean; items: ProductGridItem[] };

function RecentProducts({ currentSlug }: { currentSlug: string }) {
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

export default function ProductView({ product, breadcrumbs, admin, similar }: ProductViewProps) {
  const [selection, setSelection] = useState<SelectionState>(() => buildInitialSelection(product.variants));
  const [activeImage, setActiveImage] = useState<string | undefined>(product.gallery[0]);

  const gallery = useMemo(() => composeGallery(product, selection), [product, selection]);
  const { raw: finalPrice, formatted: formattedPrice } = useMemo(
    () => computePrice(product, selection),
    [product, selection],
  );
  const variantLabel = useMemo(() => formatVariantLabel(product.variants, selection), [product.variants, selection]);

  const handleVariantSelect = useCallback(
    (group: ProductVariantGroup, option: ProductVariantOption) => {
      if (option.disabled) return;
      setSelection((prev) => ({ ...prev, [group.id]: option }));
      if (option.image) {
        setActiveImage(option.image);
      }
    },
    [],
  );

  const handleGalleryChange = useCallback((url: string) => {
    setActiveImage(url);
  }, []);

  const onAdd = useCallback(() => {
    try {
      track({
        name: "add_to_cart",
        params: {
          product_id: product.id,
          slug: product.slug,
          price: finalPrice,
          variant: variantLabel ?? undefined,
        },
      });
    } catch {
      /* noop */
    }
  }, [product.id, product.slug, finalPrice, variantLabel]);

  return (
    <div className="space-y-12">
      <ProductClientEffects product={product} />
      <ProductImpression productId={product.id} dataset={product.dataset} />

      <nav aria-label="Хлебные крошки" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li className="flex items-center gap-2">
            <Link href="/" className="transition hover:text-primary hover:underline">
              Главная
            </Link>
          </li>
          {breadcrumbs.map((crumb) => (
            <li key={crumb.href} className="flex items-center gap-2">
              <span aria-hidden>›</span>
              <Link href={crumb.href} className="transition hover:text-primary hover:underline">
                {crumb.name}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span aria-hidden>›</span>
            <span aria-current="page" className="font-medium text-fg">
              {product.title}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] max-[923px]:-mx-6 max-[923px]:flex max-[923px]:snap-x max-[923px]:space-x-6 max-[923px]:overflow-x-auto max-[923px]:px-6">
        <div className="max-[923px]:min-w-[calc(100vw-3rem)] max-[923px]:snap-center">
          <ProductGallery
            title={product.title}
            images={gallery}
            fallbackImage={product.fallbackImage}
            activeImage={activeImage}
            onActiveChange={(_, idx) => handleGalleryChange(gallery[idx] ?? product.fallbackImage)}
          />
        </div>

        <aside className="mt-8 space-y-6 max-[923px]:min-w-[calc(100vw-3rem)] max-[923px]:snap-center max-[923px]:mt-0 xl:mt-0 xl:pl-4">
          <div className="space-y-4 rounded-3xl border border-border/40 bg-card/70 p-6">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
              <span>Каталог</span>
              {product.category.name ? <span>{product.category.name}</span> : null}
            </div>
            <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{product.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                {product.availabilityLabel}
              </span>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
                ★ {product.reviewSummary.average.toFixed(1)}
                <span className="text-muted-foreground">
                  ({product.reviewSummary.count} отзыв{product.reviewSummary.count % 10 === 1 ? "" : "ов"})
                </span>
              </span>
            </div>

            {product.shortDescription ? (
              <p className="text-sm leading-relaxed text-fg/80">{product.shortDescription}</p>
            ) : null}

            {product.variants.length ? (
              <div className="space-y-4">
                {product.variants.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{group.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option) => {
                        const active = selection[group.id]?.value === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleVariantSelect(group, option)}
                            disabled={option.disabled}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/40 bg-card text-fg hover:border-border/80",
                              option.disabled ? "cursor-not-allowed opacity-40" : null,
                            )}
                            title={option.disabled ? "Недоступно" : option.label}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted">Цена</div>
                <div className="text-3xl font-semibold text-fg">{formattedPrice}</div>
              </div>
              <AddToCartButton
                productId={product.id}
                title={product.title}
                label="Добавить в корзину"
                className="h-12 rounded-full px-6 text-sm font-semibold"
                quantity={1}
                analyticsParams={{
                  product_id: product.id,
                  slug: product.slug,
                  price: finalPrice,
                  variant: variantLabel ?? undefined,
                  dataset: product.dataset,
                }}
              />
              {admin.isAdmin ? (
                <TrackClickButton productId={product.id} dataset={product.dataset} />
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => (
                <div
                  key={method}
                  className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card/80 px-3 py-2 text-sm text-fg/90"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {method.slice(0, 2)}
                  </span>
                  <span>{method}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-border/40 bg-card/70 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Мы заботимся о вас</h3>
            <ul className="space-y-3">
              {TRUST_POINTS.map((point) => (
                <li key={point.title} className="flex items-center gap-3 text-sm text-fg/90">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {point.icon}
                  </span>
                  <span>{point.title}</span>
                </li>
              ))}
            </ul>
            {admin.isAdmin ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-card/80 px-4 py-3 text-xs text-muted-foreground">
                <div>Clicks: <span className="font-semibold text-fg">{admin.clicks}</span></div>
                <div>Impressions: <span className="font-semibold text-fg">{admin.impressions}</span></div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <ProductSpecs specs={product.specs} description={product.description} />

      <ProductReviews
        productId={product.id}
        slug={product.slug}
        initialAverage={product.reviewSummary.average}
        initialCount={product.reviewSummary.count}
      />

      {similar.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-fg">Похожие товары</h2>
          <ProductGrid items={similar} wrapWithContainer={false} />
        </section>
      ) : null}

      <RecentProducts currentSlug={product.slug} />

      <ProductStickyCTA
        productId={product.id}
        title={product.title}
        price={formattedPrice}
        dataset={product.dataset}
        selectedVariantLabel={variantLabel}
        secondaryAction={
          admin.isAdmin ? (
            <TrackClickButton productId={product.id} dataset={product.dataset} />
          ) : null
        }
        analyticsParams={{
          product_id: product.id,
          slug: product.slug,
          price: finalPrice,
          variant: variantLabel ?? undefined,
          dataset: product.dataset,
        }}
      />
    </div>
  );
}
