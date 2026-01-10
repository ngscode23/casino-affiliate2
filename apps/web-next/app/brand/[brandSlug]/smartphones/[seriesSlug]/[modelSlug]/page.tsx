import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { buildCanonical } from "@/lib/env/siteUrl";
import { siteConfig } from "@/lib/site-config";
import { normalizeSlug } from "@/lib/catalog/slug";
import {
  fetchBrandBySlug,
  fetchModelBySlug,
  fetchModelSkus,
  normalizeBrand,
} from "@/lib/catalog/smartphones";
import { ProductGrid, type ProductGridItem } from "@/components/ProductGrid";
import { formatPrice } from "@/app/products/utils";
import { normalizeImageUrl } from "@/app/products/[slug]/data";
import { Button, Input, Select } from "@/components/ui";

type PageProps = {
  params: Promise<{ brandSlug: string; seriesSlug: string; modelSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SITE_NAME = siteConfig.name || "Neon Shop";
const PAGE_SIZE = 24;

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string): string | undefined {
  const raw = searchParams?.[key];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function parseIntParam(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPageQuery(searchParams: SearchParams, updates: Record<string, string | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (!value) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else {
      params.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function resolveAvailability(isAvailable: boolean | null, inventoryStatus: string | null) {
  if (inventoryStatus === "preorder") return "PreOrder" as const;
  if (inventoryStatus === "out_of_stock" || isAvailable === false) return "OutOfStock" as const;
  return "InStock" as const;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const normalizedBrand = normalizeBrand(resolvedParams.brandSlug);
  const normalizedSeries = normalizeSlug(resolvedParams.seriesSlug);
  const normalizedModel = normalizeSlug(resolvedParams.modelSlug);
  if (!normalizedBrand || !normalizedSeries || !normalizedModel) {
    return { title: `Model not found | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }

  const brand = await fetchBrandBySlug(normalizedBrand);
  if (!brand) return { title: `Model not found | ${SITE_NAME}`, robots: { index: false, follow: false } };

  const model = await fetchModelBySlug(brand.slug, normalizedSeries, normalizedModel);
  if (!model) return { title: `Model not found | ${SITE_NAME}`, robots: { index: false, follow: false } };

  const canonical = buildCanonical(
    `/brand/${model.brandSlug}/smartphones/${model.seriesSlug}/${model.slug}`,
  );

  const title = `${model.brandName} ${model.title} | ${SITE_NAME}`;
  const description = `Browse ${model.brandName} ${model.title} SKUs and filter by price, rating, or availability.`;

  const resolvedSearch = (await searchParams) ?? {};
  const hasFilters = ["price_min", "price_max", "availability", "rating_min", "sort", "page"].some(
    (key) => Boolean(getParam(resolvedSearch, key)),
  );

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    twitter: { card: "summary_large_image", title, description },
    ...(hasFilters ? { robots: { index: false, follow: true } } : null),
  };
}

export default async function SmartphoneModelPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = (await searchParams) ?? {};

  const normalizedBrand = normalizeBrand(resolvedParams.brandSlug);
  const normalizedSeries = normalizeSlug(resolvedParams.seriesSlug);
  const normalizedModel = normalizeSlug(resolvedParams.modelSlug);
  if (!normalizedBrand || !normalizedSeries || !normalizedModel) notFound();

  const brand = await fetchBrandBySlug(normalizedBrand);
  if (!brand) notFound();

  const model = await fetchModelBySlug(brand.slug, normalizedSeries, normalizedModel);
  if (!model) notFound();

  if (
    model.brandSlug !== resolvedParams.brandSlug ||
    model.seriesSlug !== resolvedParams.seriesSlug ||
    model.slug !== resolvedParams.modelSlug
  ) {
    redirect(`/brand/${model.brandSlug}/smartphones/${model.seriesSlug}/${model.slug}`);
  }

  const priceMin = parseIntParam(getParam(resolvedSearch, "price_min"));
  const priceMax = parseIntParam(getParam(resolvedSearch, "price_max"));
  const availability = getParam(resolvedSearch, "availability");
  const ratingMin = parseIntParam(getParam(resolvedSearch, "rating_min"));
  const sort = getParam(resolvedSearch, "sort") ?? "recent";
  const page = Math.max(1, parseIntParam(getParam(resolvedSearch, "page")) ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { items, total } = await fetchModelSkus({
    brandSlug: model.brandSlug,
    seriesSlug: model.seriesSlug,
    modelSlug: model.slug,
    limit: PAGE_SIZE,
    offset,
    filters: {
      priceMinCents: typeof priceMin === "number" ? Math.round(priceMin * 100) : null,
      priceMaxCents: typeof priceMax === "number" ? Math.round(priceMax * 100) : null,
      availability: availability ?? null,
      ratingMin: typeof ratingMin === "number" ? ratingMin : null,
      sort,
    },
  });

  const gridItems: ProductGridItem[] = items.map((sku) => {
    const priceValue =
      typeof sku.price === "number"
        ? sku.price
        : typeof sku.priceCents === "number"
          ? sku.priceCents / 100
          : null;
    const priceLabel = typeof priceValue === "number" ? formatPrice(priceValue, sku.currency ?? "EUR") : null;
    const availabilityLabel = sku.inventoryStatus?.replace(/_/g, " ") ?? null;
    return {
      id: sku.id,
      slug: sku.modelSlug,
      title: sku.title || sku.modelTitle,
      subtitle: sku.modelTitle,
      price: priceLabel,
      image: normalizeImageUrl(sku.imageUrl),
      availability: resolveAvailability(sku.isAvailable, sku.inventoryStatus),
      availabilityLabel: availabilityLabel ?? null,
      variantLabel: sku.inventoryStatus ?? null,
      meta: sku.rating != null ? `Rating ${sku.rating.toFixed(1)}` : null,
    };
  });

  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  return (
    <div className="bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
        <nav className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/brand" className="font-medium text-muted hover:text-fg">
                Brands
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/brand/${model.brandSlug}`} className="font-medium text-muted hover:text-fg">
                {model.brandName}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/brand/${model.brandSlug}/smartphones`}
                className="font-medium text-muted hover:text-fg"
              >
                Smartphones
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/brand/${model.brandSlug}/smartphones/${model.seriesSlug}`}
                className="font-medium text-muted hover:text-fg"
              >
                {model.seriesTitle}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-fg">{model.title}</li>
          </ol>
        </nav>

        <header className="mt-6 space-y-3">
          <h1 className="text-3xl font-semibold text-fg sm:text-4xl">
            {model.brandName} {model.title}
          </h1>
          <p className="text-base text-muted">
            Filter SKU variants by price, rating, and availability.
          </p>
        </header>

        <form className="mt-6 rounded-2xl border border-border/40 bg-card/80 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              name="price_min"
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              placeholder="Price min"
              defaultValue={priceMin ?? ""}
            />
            <Input
              name="price_max"
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              placeholder="Price max"
              defaultValue={priceMax ?? ""}
            />
            <Select name="availability" defaultValue={availability ?? ""}>
              <option value="">All availability</option>
              <option value="in_stock">In stock</option>
              <option value="preorder">Preorder</option>
              <option value="out_of_stock">Out of stock</option>
            </Select>
            <Select name="rating_min" defaultValue={ratingMin ?? ""}>
              <option value="">Any rating</option>
              <option value="4.5">4.5+</option>
              <option value="4">4.0+</option>
              <option value="3">3.0+</option>
            </Select>
            <Select name="sort" defaultValue={sort}>
              <option value="recent">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating-desc">Rating: high to low</option>
            </Select>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" size="sm" variant="primary">
              Apply filters
            </Button>
            <Link
              href={`/brand/${model.brandSlug}/smartphones/${model.seriesSlug}/${model.slug}`}
              className="inline-flex items-center justify-center rounded-full border border-border/40 bg-card/60 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
            >
              Clear
            </Link>
          </div>
        </form>

        <section className="mt-8">
          {gridItems.length ? (
            <ProductGrid items={gridItems} layout="grid" showAddToCart={false} />
          ) : (
            <div className="rounded-2xl border border-border/40 bg-card/70 p-6 text-sm text-muted">
              No SKUs found for these filters.
            </div>
          )}
        </section>

        <div className="mt-8 flex items-center justify-between text-sm text-muted">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-3">
            {page > 1 ? (
              <Link
                href={buildPageQuery(resolvedSearch, { page: String(page - 1) })}
                className="rounded-full border border-border/40 bg-card/60 px-4 py-2 font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={buildPageQuery(resolvedSearch, { page: String(page + 1) })}
                className="rounded-full border border-border/40 bg-card/60 px-4 py-2 font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-8 text-sm text-muted">
          Canonical PDP:{" "}
          <Link href={`/products/${model.slug}`} className="font-semibold text-fg hover:text-primary">
            /products/{model.slug}
          </Link>
        </div>
      </div>
    </div>
  );
}
