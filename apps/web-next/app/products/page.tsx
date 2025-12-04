import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { fetchCatalogCategoryBySlug } from "@/lib/catalog/categories";
import { fetchProductListingPage } from "@/lib/catalog/product-source";
import { getAdminClient } from "@/utils/supabase/admin";

import ProductsClient from "./products-client";
import { CATALOG_NAME, loadProductsData } from "./data";
import { serializeJsonLd } from "@shared/lib/jsonld";
import { resolveFilterParams } from "./filter-params";
import { fetchUserProfile } from "@/lib/personalization/rank";
import { getRecommendationsForActor } from "@/lib/recs-server";
import type { Product } from "./types";
import { siteConfig } from "@/lib/site-config";

const SITE_NAME = siteConfig.name || "Neon Shop";
const BASE_TITLE = `Каталог товаров | ${SITE_NAME}`;
const BASE_DESCRIPTION =
  "Каталог Neon Shop: новинки, акции и популярные товары. Актуальные цены, наличие и удобные фильтры по категориям.";

export const revalidate = 90;
export const dynamic = "force-dynamic";

type ProductsMetadataProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
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

export async function generateMetadata({ searchParams }: ProductsMetadataProps = {}): Promise<Metadata> {
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
    const fallbackTitle = `${BASE_TITLE} — категория не найдена`;
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
  const countLabel = hasCount ? ` — ${productCount} моделей` : "";
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

const MIN_RECS_FOR_INTERLEAVE = 3;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeAdaptiveStride(preferredCount: number, othersCount: number, treatment: string | null | undefined) {
  if (preferredCount <= 0) return 1;
  const base = clamp(Math.floor(othersCount / Math.max(preferredCount, 1)), 1, 5);
  const targetMin = treatment === "explore" ? 0.3 : 0.2;
  const targetMax = treatment === "explore" ? 0.45 : 0.35;
  const calcShare = (stride: number) => 1 / (1 + stride);
  let stride = base;
  let share = calcShare(stride);

  while (share < targetMin && stride > 1) {
    stride -= 1;
    share = calcShare(stride);
  }
  while (share > targetMax && stride < 5) {
    stride += 1;
    share = calcShare(stride);
  }

  return clamp(stride, 1, 5);
}

function interleaveWithDiversification(preferred: Product[], others: Product[], stride: number) {
  const interleaved: Product[] = [];
  let lastRecCategory: string | null = null;
  let categoryStreak = 0;

  const pickNextRec = () => {
    if (!preferred.length) return null;
    if (lastRecCategory && categoryStreak >= 2) {
      const altIndex = preferred.findIndex((item) => (item.categorySlug ?? null) !== lastRecCategory);
      if (altIndex > 0) {
        return preferred.splice(altIndex, 1)[0];
      }
    }
    return preferred.shift() ?? null;
  };

  while (preferred.length || others.length) {
    if (preferred.length) {
      const nextRec = pickNextRec();
      if (nextRec) {
        interleaved.push(nextRec);
        const cat = nextRec.categorySlug ?? null;
        if (cat && cat === lastRecCategory) {
          categoryStreak += 1;
        } else {
          lastRecCategory = cat;
          categoryStreak = 1;
        }
      }
    }

    if (others.length) {
      const strideStep = interleaved.length % (stride + 1);
      if (strideStep === 0 || !preferred.length) {
        const next = others.shift();
        if (next) interleaved.push(next);
      }
    }
  }

  return interleaved;
}

async function loadPersonalizedProducts() {
  const hdrs = await headers();
  const userId = hdrs.get("x-user-id");
  if (!userId) return null;

  const profile = await fetchUserProfile(userId);
  if (!profile) return null;

  const recs = await getRecommendationsForActor({ actor: profile.anon_id });
  if (!recs?.items?.length) return null;

  return { recs, profile };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | URLSearchParams
    | Promise<Record<string, string | string[] | undefined> | URLSearchParams | undefined>
    | undefined;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = resolveFilterParams(resolvedSearchParams);
  const personalized = await loadPersonalizedProducts();

  const listingPromise = loadProductsData({
    query: filters.query,
    dataset: filters.dataset,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    minRating: filters.minRating,
    sort: filters.sort,
    category: filters.category,
  });

  const listing = await listingPromise;

  // If we have personalized recs, interleave them near the top of the list
  if (personalized?.recs?.items?.length && listing.products.length) {
    const recItems = personalized.recs.items;
    const preferredProducts = listing.products.filter((p) =>
      recItems.some((rec) => (rec.product_id ?? rec.product?.id) === p.id),
    );
    const otherProducts = listing.products.filter((p) => !preferredProducts.includes(p));
    const stride = computeAdaptiveStride(
      preferredProducts.length,
      otherProducts.length,
      personalized.recs.treatment ?? null,
    );
    listing.products = interleaveWithDiversification([...preferredProducts], [...otherProducts], stride);
  }

  const description =
    filters.query && filters.query.trim().length
      ? `Результаты поиска «${filters.query}» в каталоге ${CATALOG_NAME || "магазина"}`
      : BASE_DESCRIPTION;

  return (
    <div className="bg-background">
      {listing.structuredData ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(listing.structuredData) }}
        />
      ) : null}
      <section>
        <div className="mx-auto max-w-screen-xl space-y-6 px-6 pt-12 pb-0 sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
          <header className="flex flex-col gap-3 text-center sm:text-left">
            <span className="text-sm font-medium text-muted">Каталог товаров</span>
            <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{CATALOG_NAME ?? "Каталог"}</h1>
            <p className="text-base text-muted sm:max-w-3xl">{description}</p>
            {typeof listing.totalCount === "number" ? (
              <span className="text-sm text-muted">Всего позиций: {listing.totalCount}</span>
            ) : null}
          </header>
        </div>
        <ProductsClient
          products={listing.products}
          categories={listing.categories}
          catalogName={CATALOG_NAME ?? "Каталог"}
          initialQuery={filters.query}
          initialCategory={filters.category}
          initialDataset={filters.dataset}
          initialSort={filters.sort}
          initialPriceMin={filters.priceMin}
          initialPriceMax={filters.priceMax}
          initialMinRating={filters.minRating}
          totalAvailable={listing.totalCount}
        />
        {listing.fetchError ? (
          <div className="mx-auto max-w-screen-md px-6 pb-12 text-center text-sm text-red-400">
            Не удалось обновить список товаров: {String((listing.fetchError as any)?.message ?? listing.fetchError)}
            {" · "}
            <Link href="/contact" className="text-blue-400 hover:text-blue-300">
              Написать в поддержку
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
