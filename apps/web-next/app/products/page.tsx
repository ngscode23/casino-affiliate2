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
import { ProductListAnalytics } from "@/components/analytics/EcommerceEvents";

const SITE_NAME = siteConfig.name || "Neon Shop";
const BASE_TITLE = `??????? ??????? | ${SITE_NAME}`;
const BASE_DESCRIPTION =
  "??????? Neon Shop: ???????, ????? ? ?????????? ??????. ?????????? ????, ??????? ? ??????? ??????? ?? ??????????.";

export const revalidate = 180;
export const dynamic = "force-static";
export const fetchCache = "force-cache";

type ListingResult = Awaited<ReturnType<typeof fetchProductsPage>>;
type ListingResponse = { listing: ListingResult; fetchError: string | null };

type ProductsMetadataProps = {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProductsPageProps = {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

  const origin =
    (process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.NEXT_SITE_URL ||
      "https://neon4.vercel.app").replace(/\/$/, "");
  const baseCanonical = `${origin}/products`;

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
    const fallbackTitle = `${BASE_TITLE} - ????????? ?? ???????`;
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

  const canonical = `${baseCanonical}?category=${encodeURIComponent(category.slug)}`;
  const hasCount = typeof productCount === "number" && productCount > 0;
  const countLabel = hasCount ? ` - ${productCount} ???????` : "";
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
  const resolvedSearchParams = await searchParams;
  const filters = resolveFilterParams(resolvedSearchParams);
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
  const { listing, fetchError } = use(listingPromise);

  const description =
    filters.query && filters.query.trim().length
      ? `?????????? ?????? Ž${filters.query}Ż ? ???????? ${CATALOG_NAME || "????????"}`
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
            <span className="text-sm font-medium text-muted">??????? ???????</span>
            <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{CATALOG_NAME ?? "???????"}</h1>
            <p className="text-base text-muted sm:max-w-3xl">{description}</p>
            {typeof listing.total === "number" ? (
              <span className="text-sm text-muted">????? ???????: {listing.total}</span>
            ) : null}
          </header>
        </div>
        <ProductsClient
          products={listing.items}
          categories={listing.categories}
          catalogName={CATALOG_NAME ?? "???????"}
          initialQuery={filters.query}
          initialCategory={filters.category}
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
            ?? ??????? ???????? ?????? ???????: {fetchError}
            {" ú "}
            <Link href="/contact" className="text-blue-400 hover:text-blue-300">
              ???????? ? ?????????
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
        structuredData: null,
      },
      fetchError: (error as Error)?.message ?? String(error),
    };
  }
}
