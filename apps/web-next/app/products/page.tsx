import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

import ProductsClient from "./products-client";
import { CATALOG_NAME, loadProductsData } from "./data";
import { serializeJsonLd } from "@shared/lib/jsonld";
import { resolveFilterParams } from "./filter-params";
import { fetchUserProfile } from "@/lib/personalization/rank";
import { getRecommendationsForActor } from "@/lib/recs-server";
import type { Product } from "./types";
import { siteConfig } from "@/lib/site-config";

const BASE_TITLE = siteConfig.name ? `${siteConfig.name} — Каталог` : "Neon Shop — Каталог";
const BASE_DESCRIPTION =
  "Каталог Neon Shop: электроника, гаджеты, аксессуары. Фильтруйте по цене, популярности и рейтингу, сравнивайте бренды и находите актуальные предложения.";

export const revalidate = 90;
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const origin =
    (process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.NEXT_SITE_URL ||
      "https://neon4.vercel.app").replace(/\/$/, "");

  const canonical = `${origin}/products`;

  return {
    title: BASE_TITLE,
    description: BASE_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title: BASE_TITLE,
      description: BASE_DESCRIPTION,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: BASE_TITLE,
      description: BASE_DESCRIPTION,
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
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const filters = resolveFilterParams(searchParams);
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
