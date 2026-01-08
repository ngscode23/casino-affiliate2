import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, use } from "react";
import { fetchCatalogCategoryBySlug } from "@/lib/catalog/categories";
import { fetchProductListingPage } from "@/lib/catalog/product-source";
import { getAdminClient } from "@/utils/supabase/admin";
import Skeleton from "@ui/components/common/skeleton";

import ProductsClient from "./products-client";
import { CATALOG_NAME, PRODUCT_PAGE_SIZE_DEFAULT, fetchProductsPage } from "./data";
import { serializeJsonLd } from "@shared/lib/jsonld";
import { resolveFilterParams } from "./filter-params";
import { siteConfig } from "@/lib/site-config";
import { buildCanonical, getSiteOrigin } from "@/lib/env/siteUrl";
import { ProductListAnalytics } from "@/components/analytics/EcommerceEvents";

const SITE_NAME = siteConfig.name || "Neon Shop";
const BASE_TITLE = `Product catalog | ${SITE_NAME}`;
const BASE_DESCRIPTION = "Browse the Neon Shop catalog: curated picks, transparent pricing, and fresh arrivals.";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type ListingResult = Awaited<ReturnType<typeof fetchProductsPage>>;
type ListingResponse = { listing: ListingResult; fetchError: string | null };

type SearchParamsObject = Record<string, string | string[] | undefined>;
type MaybePromise<T> = T | Promise<T>;

type ProductsMetadataProps = {
  params?: MaybePromise<SearchParamsObject>;
  searchParams?: MaybePromise<SearchParamsObject>;
};

type ProductsPageProps = {
  params?: MaybePromise<SearchParamsObject>;
  searchParams?: MaybePromise<SearchParamsObject>;
};

function normalizeCategoryParam(input: string | string[] | undefined): string | null {
  const value = Array.isArray(input) ? input[0] : input;
  if (typeof value !== "string") return null;
  const slug = value.trim();
  return slug ? slug.toLowerCase() : null;
}

async function fetchCategoryMeta(slug: string) {
  const category = await fetchCatalogCategoryBySlug(slug);
  let productCount: number | null = null;

  try {
    const supabase = getAdminClient();
    const { count, error } = await fetchProductListingPage({
      supabase,
      select: "id",
      filters: { category: slug, dataset: "shop" },
      limit: 1,
      withCount: true,
    });
    if (!error && typeof count === "number") {
      productCount = count;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] failed to count products for category", slug, error);
    }
  }

  return { category, productCount };
}

export async function generateMetadata({ searchParams }: ProductsMetadataProps): Promise<Metadata> {
  const resolvedSearch = (await searchParams) ?? {};
  const categoryParam = normalizeCategoryParam(resolvedSearch.category);

  const baseCanonical = `${getSiteOrigin()}/products`;

  if (!categoryParam) {
    return {
      title: BASE_TITLE,
      description: BASE_DESCRIPTION,
      alternates: { canonical: baseCanonical },
      openGraph: {
        type: "website",
        title: BASE_TITLE,
        description: BASE_DESCRIPTION,
        url: baseCanonical,
        siteName: SITE_NAME,
      },
      twitter: {
        card: "summary_large_image",
        title: BASE_TITLE,
        description: BASE_DESCRIPTION,
      },
    };
  }

  const { category, productCount } = await fetchCategoryMeta(categoryParam);

  if (!category) {
    const fallbackTitle = `${BASE_TITLE} - Category not found`;
    return {
      title: fallbackTitle,
      description: BASE_DESCRIPTION,
      alternates: { canonical: baseCanonical },
      robots: { index: false, follow: false },
      openGraph: {
        type: "website",
        title: fallbackTitle,
        description: BASE_DESCRIPTION,
        url: baseCanonical,
        siteName: SITE_NAME,
      },
      twitter: {
        card: "summary_large_image",
        title: fallbackTitle,
        description: BASE_DESCRIPTION,
      },
    };
  }

  const canonical = buildCanonical(`/products?category=${encodeURIComponent(category.slug)}`);
  const hasCount = typeof productCount === "number" && productCount > 0;
  const countLabel = hasCount ? ` - ${productCount} products` : "";
  const title = `${category.title}${countLabel} | ${SITE_NAME}`;
  const description = category.description?.trim() || BASE_DESCRIPTION;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearch = (await searchParams) ?? {};
  const filters = resolveFilterParams(resolvedSearch);
  const listingPromise = getListing(filters);

  return (
    <div className="bg-background">
      <Suspense fallback={<CatalogSkeleton />}>
        <ProductsStream listingPromise={listingPromise} filters={filters} />
      </Suspense>
    </div>
  );
}

function ProductsStream({
  listingPromise,
  filters,
}: {
  listingPromise: Promise<ListingResponse>;
  filters: ReturnType<typeof resolveFilterParams>;
}) {
  // use() enables streaming: Suspense renders CatalogSkeleton while data resolves,
  // improving TTFB versus awaiting before render.

  const { listing, fetchError } = use(listingPromise);

  const description =
    filters.query && filters.query.trim().length
      ? `Search results for "${filters.query}" in ${CATALOG_NAME || "catalog"}`
      : BASE_DESCRIPTION;

  const analyticsItems = listing.items.map((product, index) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    currency: product.currency,
    category: product.category ?? product.categorySlug ?? null,
    position: index + 1,
    listId: filters.category ?? null,
    listName: CATALOG_NAME ?? "Products",
  }));

  return (
    <>
      <ProductListAnalytics
        items={analyticsItems}
        listId={filters.category ?? undefined}
        listName={CATALOG_NAME ?? "Products"}
      />
      {listing.structuredData ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(listing.structuredData) }}
        />
      ) : null}
      <section aria-busy={Boolean(fetchError)} aria-live="polite">
        <div className="mx-auto max-w-screen-xl space-y-6 px-6 pt-12 pb-0 sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
          <header className="flex flex-col gap-3 text-center sm:text-left">
            <span className="text-sm font-medium text-muted">Product catalog</span>
            <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{CATALOG_NAME ?? "Catalog"}</h1>
            <p className="text-base text-muted sm:max-w-3xl">{description}</p>
            {typeof listing.total === "number" ? (
              <span className="text-sm text-muted">Total products: {listing.total}</span>
            ) : null}
          </header>
        </div>
        <ProductsClient
          products={listing.items}
          categories={listing.categories}
          initialBrandFacets={listing.brandFacets ?? []}
          initialModelFacets={listing.modelFacets ?? {}}
          catalogName={CATALOG_NAME ?? "Catalog"}
          debug={listing.debug ?? null}
          initialQuery={filters.query}
          initialCategory={filters.category}
          initialBrand={filters.brand}
          initialModel={filters.model}
          initialDataset={filters.dataset}
          initialSort={filters.sort}
          initialPriceMin={filters.priceMin}
          initialPriceMax={filters.priceMax}
          initialMinRating={filters.minRating}
          totalAvailable={listing.total}
          initialNextCursor={listing.nextCursor}
          fetchError={fetchError}
        />
        {fetchError ? (
          <div className="mx-auto max-w-screen-md px-6 pb-12 text-center text-sm text-red-400">
            Failed to load catalog: {fetchError}
            {" | "}
            <Link href="/contact" className="text-blue-400 hover:text-blue-300">
              Contact support
            </Link>
          </div>
        ) : null}
      </section>
    </>
  );
}

function CatalogSkeleton() {
  return (
    <div className="bg-background" aria-busy="true" aria-live="polite">
      <section className="mx-auto max-w-screen-xl space-y-6 px-6 pt-12 pb-14 sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
        <div className="flex flex-col gap-3 text-center sm:text-left">
          <Skeleton className="inline-flex h-4 w-36 sm:w-28" />
          <Skeleton className="h-9 w-64 sm:w-80" />
          <Skeleton className="mt-1 h-5 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`catalog-skeleton-${idx}`}
              className="overflow-hidden rounded-3xl border border-border/50 bg-card/80 p-4 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.35)]"
            >
              <Skeleton className="h-52 w-full rounded-2xl" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-full" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
                <Skeleton className="h-9 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

async function getListing(filters: ReturnType<typeof resolveFilterParams>): Promise<ListingResponse> {
  try {
    const listing = await fetchProductsPage(
      {
        query: filters.query,
        dataset: filters.dataset,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        minRating: filters.minRating,
        sort: filters.sort,
        category: filters.category,
        brand: filters.brand,
        model: filters.model,
      },
      { limit: PRODUCT_PAGE_SIZE_DEFAULT, cursor: 0 },
    );
    return { listing, fetchError: null };
  } catch (error) {
    return {
      listing: {
        items: [],
        nextCursor: null,
        total: 0,
        categories: [],
        brandFacets: [],
        modelFacets: {},
        structuredData: null,
        debug: null,
        fetchError: (error as Error)?.message ?? String(error),
      },
      fetchError: (error as Error)?.message ?? String(error),
    };
  }
}
