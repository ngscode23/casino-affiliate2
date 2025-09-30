/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType } from "react";
import Link from "next/link";

import { Search, Images, Video, Star, ThumbsUp, Heart, Upload, Trash2, User, Filter, MousePointerClick, Eye, Share2 } from "lucide-react";

import type { Product } from "./types";
import { formatPrice } from "./utils";
import { getFallbackImageByKey } from "./fallback-images";
import styles from "./products-client.module.css";

const controlClass =
  "h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white/80 placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20";

const sidebarPrimary = [
  { icon: Images, label: "Images" },
  { icon: Video, label: "Videos" },
  { icon: Star, label: "Top" },
  { icon: ThumbsUp, label: "Likes" },
];

const sidebarSecondary = [
  { icon: User, label: "My media" },
  { icon: Heart, label: "Favorites" },
  { icon: Upload, label: "Uploads" },
  { icon: Trash2, label: "Trash" },
];

const sortComparators: Record<FiltersState["sort"], (a: Product, b: Product) => number> = {
  recent: (a, b) => a.order - b.order,
  popular: (a, b) => (b.clicks || 0) - (a.clicks || 0) || (b.impressions || 0) - (a.impressions || 0),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  impressions: (a, b) => (b.impressions || 0) - (a.impressions || 0),
};

const CHUNK_SIZE = 14;

type FiltersState = {
  query: string;
  dataset: "all" | "shop" | "legacy";
  sort: "recent" | "popular" | "price-asc" | "price-desc" | "impressions";
};

export default function ProductsClient({ products }: { products: Product[] }) {
  const [filters, setFilters] = useState<FiltersState>({ query: "", dataset: "all", sort: "recent" });
  const [visible, setVisible] = useState(CHUNK_SIZE);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const datasetOptions = useMemo(() => {
    const values = new Set<Product["dataset"]>();
    for (const product of products) values.add(product.dataset);
    return ["all", ...Array.from(values)];
  }, [products]);

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    let result = products;
    if (query) {
      result = result.filter((product) => (product.title + " " + (product.description || "")).toLowerCase().includes(query));
    }
    if (filters.dataset !== "all") {
      result = result.filter((product) => product.dataset === filters.dataset);
    }
    return [...result].sort(sortComparators[filters.sort]);
  }, [filters, products]);

  const totals = useMemo(() => {
    let clicks = 0;
    let impressions = 0;
    for (const product of products) {
      clicks += product.clicks || 0;
      impressions += product.impressions || 0;
    }
    return { clicks, impressions };
  }, [products]);

  useEffect(() => {
    setVisible(CHUNK_SIZE);
  }, [filters]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible((prev) => {
            if (prev >= filtered.length) return prev;
            return Math.min(filtered.length, prev + CHUNK_SIZE);
          });
        }
      });
    }, { rootMargin: "160px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length]);

  const displayed = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  const onQueryChange = (event: ChangeEvent<HTMLInputElement>) => setFilters((prev) => ({ ...prev, query: event.target.value }));
  const onDatasetChange = (event: ChangeEvent<HTMLSelectElement>) => setFilters((prev) => ({ ...prev, dataset: event.target.value as FiltersState["dataset"] }));
  const onSortChange = (event: ChangeEvent<HTMLSelectElement>) => setFilters((prev) => ({ ...prev, sort: event.target.value as FiltersState["sort"] }));
  const resetFilters = () => setFilters({ query: "", dataset: "all", sort: "recent" });

  const closeModal = useCallback(() => setModalProduct(null), []);

  useEffect(() => {
    if (!modalProduct) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [modalProduct, closeModal]);

  return (
    <div className="md:flex md:items-start md:gap-8">
      <aside className="hidden md:flex md:w-72 md:flex-col md:gap-6">
        <div className="sticky top-24 space-y-6">
          <div className="rounded-2xl border border-white/5 bg-black/30 p-5 shadow-[0_18px_60px_rgba(10,12,25,0.45)]">
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">Catalog</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Explore</h1>
            <p className="mt-2 text-sm text-white/55">
              {displayed.length} of {products.length} products · {totals.clicks} clicks · {totals.impressions} impressions
            </p>
            <Link
              href="/account"
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Account
            </Link>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/5 bg-black/40 p-5 shadow-[0_18px_60px_rgba(10,12,25,0.6)]">
            <SidebarSearch value={filters.query} onChange={onQueryChange} />
            <div className="space-y-3">
              <FilterControl label="Dataset">
                <select className={controlClass} value={filters.dataset} onChange={onDatasetChange}>
                  {datasetOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All datasets" : option === "shop" ? "Shop" : "Legacy"}
                    </option>
                  ))}
                </select>
              </FilterControl>
              <FilterControl label="Sort">
                <select className={controlClass} value={filters.sort} onChange={onSortChange}>
                  <option value="recent">Newest first</option>
                  <option value="popular">Most popular</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="impressions">Most impressions</option>
                </select>
              </FilterControl>
              <button
                type="button"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white transition hover:border-white/20 hover:bg-white/10"
                onClick={resetFilters}
              >
                <Filter className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          <nav className="space-y-4 rounded-2xl border border-white/5 bg-black/40 p-5 shadow-[0_18px_60px_rgba(10,12,25,0.6)]">
            <SidebarSection title="Explore" links={sidebarPrimary} />
            <SidebarSection title="Library" links={sidebarSecondary} />
          </nav>
        </div>
      </aside>

      <section className="flex-1 space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-black/30 p-5 shadow-[0_18px_60px_rgba(10,12,25,0.45)] md:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">Catalog</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Explore</h1>
            <p className="mt-2 text-sm text-white/55">
              {displayed.length} of {products.length} products · {totals.clicks} clicks · {totals.impressions} impressions
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
          >
            Account
          </Link>
        </header>

        <div className="flex flex-col gap-3 md:hidden">
          <div>
            <SidebarSearch value={filters.query} onChange={onQueryChange} />
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <FilterControl label="Dataset">
                <select className={controlClass} value={filters.dataset} onChange={onDatasetChange}>
                  {datasetOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All datasets" : option === "shop" ? "Shop" : "Legacy"}
                    </option>
                  ))}
                </select>
              </FilterControl>
              <FilterControl label="Sort">
                <select className={controlClass} value={filters.sort} onChange={onSortChange}>
                  <option value="recent">Newest first</option>
                  <option value="popular">Most popular</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="impressions">Most impressions</option>
                </select>
              </FilterControl>
            </div>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white transition hover:border-white/20 hover:bg-white/10"
              onClick={resetFilters}
            >
              <Filter className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {displayed.length === 0 ? (
          <EmptyState onReset={resetFilters} />
        ) : (
          <div className={styles.masonry} aria-live="polite">
            {displayed.map((product) => (
              <article
                key={product.id}
                className={styles.card + " bg-black/45"}
                tabIndex={0}
                style={{ contentVisibility: "auto" }}
                onClick={() => setModalProduct(product)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setModalProduct(product);
                  }
                }}
              >
                <ProductVisual product={product} />
              </article>
            ))}
          </div>
        )}
        <div ref={sentinelRef} aria-hidden />
        {!hasMore ? null : (
          <p className="text-center text-xs text-white/40" role="status">
            Loading more…
          </p>
        )}
      </section>

      <Lightbox product={modalProduct} onClose={closeModal} />
    </div>
  );
}

function SidebarSearch({ value, onChange }: { value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-[0.28em] text-white/40">Search</div>
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={value}
          onChange={onChange}
          placeholder="Search products"
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white/80 placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </label>
    </div>
  );
}

type SidebarLink = { icon: ComponentType<{ className?: string }>; label: string };

function SidebarSection({ title, links }: { title: string; links: SidebarLink[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-[0.28em] text-white/40">{title}</div>
      <div className="space-y-1.5">
        {links.map(({ icon: Icon, label }) => (
          <a
            key={label}
            href="#"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/55 transition hover:bg-white/10 hover:text-white"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function FilterControl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-[0.28em] text-white/40">
      {label}
      {children}
    </label>
  );
}

function ProductVisual({ product }: { product: Product }) {
  const description = product.description ? product.description : "No short description yet.";
  const imageSrc = product.mainImage && product.mainImage.trim().length > 0
    ? product.mainImage
    : getFallbackImageByKey(product.slug || product.id);
  return (
    <div className="relative">
      <img
        src={imageSrc}
        alt={product.title}
        className="block w-full object-cover"
        loading="lazy"
        decoding="async"
        fetchPriority={product.order < 4 ? "high" : "low"}
        sizes="(min-width: 1440px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="pointer-events-auto space-y-4 bg-gradient-to-t from-black/92 via-black/65 to-transparent p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <h3 className="text-base font-semibold text-white drop-shadow">{product.title}</h3>
              <p className="line-clamp-3 text-xs leading-relaxed text-white/75">{description}</p>
            </div>
            <div className="shrink-0 rounded-md bg-black/60 px-3 py-1 text-sm font-semibold text-white drop-shadow">
              {formatPrice(product.price)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-white/60">
            <span className="flex items-center gap-1">
              <MousePointerClick className="h-3 w-3" />
              {product.clicks}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {product.impressions}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={"/products/" + product.slug}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium uppercase tracking-[0.32em] text-white transition hover:border-white/20 hover:bg-white/10"
              onClick={(event) => event.stopPropagation()}
            >
              View
            </Link>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:border-white/20 hover:bg-white/10"
              aria-label="Like"
              onClick={(event) => event.stopPropagation()}
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardAction({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/70 transition hover:border-white/30 hover:text-white"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-12 text-center text-sm text-white/50">
      <p>No products match the current filters.</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.32em] text-white transition hover:border-white/20 hover:bg-white/10"
      >
        Reset filters
      </button>
    </div>
  );
}

function Lightbox({ product, onClose }: { product: Product | null; onClose: () => void }) {
  if (!product) return null;
  const imageSrc = product.mainImage && product.mainImage.trim().length > 0
    ? product.mainImage
    : getFallbackImageByKey(product.slug || product.id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" role="dialog" aria-modal="true">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black/75 p-6">
        <button
          type="button"
          className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-white transition hover:border-white/20 hover:bg-white/10"
          onClick={onClose}
        >
          Close
        </button>
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="flex items-center justify-center">
            <img
              src={imageSrc}
              alt={product.title}
              className="max-h-[70vh] w-full rounded-xl object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="space-y-4 text-sm text-white/80">
            <h2 className="text-lg font-semibold text-white">{product.title}</h2>
            <p>{product.description || "No description yet."}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
              <span>Clicks: {product.clicks}</span>
              <span>Impressions: {product.impressions}</span>
              <span>Status: {product.dataset}</span>
            </div>
            <Link
              href={"/products/" + product.slug}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium uppercase tracking-[0.32em] text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Open details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
