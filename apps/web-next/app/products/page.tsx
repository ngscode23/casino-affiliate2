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

export const metadata: Metadata = {
  title: `${CATALOG_NAME}`,
  description:
    "Browse the Neon Shop catalog: discover featured gear, compare engagement stats, and zero in on the tools that fit your workflow.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: `${CATALOG_NAME}`,
    description:
      "Browse the Neon Shop catalog: discover featured gear, compare engagement stats, and zero in on the tools that fit your workflow.",
    url: "/products",
  },
};

export const revalidate = 90;
export const dynamic = "force-dynamic";

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
    for (let i = 0; i < stride && others.length; i += 1) {
      interleaved.push(others.shift()!);
    }
  }

  return interleaved;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = resolveFilterParams(resolvedSearchParams);
  const headerStore = new Headers(await headers());
  const experimentCookieName = process.env.EXPERIMENT_COOKIE_NAME || "exp";
  const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  const getCookie = (name: string): string | null => {
    const cookieHeader = headerStore.get("cookie") || "";
    const match = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  };

  const anonId = headerStore.get("x-anon-id") || getCookie("anon_id");
  const experimentVariant =
    headerStore.get("x-experiment-variant") || getCookie(experimentCookieName) || null;
  const country = headerStore.get("x-geo-country") || headerStore.get("x-country") || undefined;
  const device = headerStore.get("x-device-class") || undefined;
  const profile = anonId ? await fetchUserProfile(anonId) : null;
  const personalizationContext = profile
    ? {
        profile,
        country: country ?? undefined,
        device,
        experimentVariant: experimentVariant ?? undefined,
      }
    : null;

  const baseLoad = await loadProductsData(
    {
      query: filters.query,
      category: filters.category !== "all" ? filters.category : undefined,
      dataset: filters.dataset,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      minRating: filters.minRating,
      sort: filters.sort,
    },
    personalizationContext ? { personalize: personalizationContext } : undefined,
  );

  // If personalized fetch fails, fall back to the cached non-personalized list to avoid blank states.
  const shouldFallbackToCachedList =
    personalizationContext && baseLoad.fetchError && (!baseLoad.products || baseLoad.products.length === 0);

  const { products, fetchError, structuredData, categories, catalogName, totalCount } = shouldFallbackToCachedList
    ? await loadProductsData({
        query: filters.query,
        category: filters.category !== "all" ? filters.category : undefined,
        dataset: filters.dataset,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        minRating: filters.minRating,
        sort: filters.sort,
      })
    : baseLoad;

  // Подмешиваем персональные рекомендации в общий список каталога
  const productsWithRecMeta: Product[] = products.map((product) => ({ ...product }));
  let productsForClient: Product[] = productsWithRecMeta;
  const actor = anonId && UUID_PATTERN.test(anonId) ? anonId : null;

  if (actor) {
    const recRes = await getRecommendationsForActor({
      actor,
      limit: 32,
      category: filters.category !== "all" ? filters.category : undefined,
      query: filters.query ?? undefined,
    });

    const recItems = Array.isArray(recRes?.items) ? recRes.items : [];
    const orderedRecItems =
      recRes.treatment === "explore"
        ? recItems
        : [...recItems].sort(
            (a, b) => (b.adjusted_score ?? b.score ?? 0) - (a.adjusted_score ?? a.score ?? 0),
          );
    if (orderedRecItems.length) {
      const usedIds = new Set<string>();
      const usedSlugs = new Set<string>();
      const recMetaMap = new Map<string, Product["recMeta"]>();
      const preferred: Product[] = [];

      for (const rec of orderedRecItems) {
        const productId = rec.product?.id ?? rec.product_id ?? null;
        const productSlug = rec.product?.slug ?? null;
        const baseProduct =
          (productId ? productsWithRecMeta.find((p) => p.id === productId) : null) ??
          (productSlug ? productsWithRecMeta.find((p) => p.slug === productSlug) : null);
        if (!baseProduct) continue;

        const dedupKey = productId ?? productSlug;
        if (dedupKey && (usedIds.has(dedupKey) || usedSlugs.has(dedupKey))) continue;
        if (productId) usedIds.add(productId);
        if (productSlug) usedSlugs.add(productSlug);

        const recMeta = {
          treatment: recRes.treatment ?? rec.treatment ?? "control",
          rank: rec.rank ?? preferred.length + 1,
          reason: rec.reason ?? null,
          score: rec.score ?? null,
          adjusted_score: rec.adjusted_score ?? null,
          bandit_from: rec.bandit?.from_rank ?? null,
          rollout: rec.bandit?.rollout ?? null,
          placement: "catalog",
          source: "catalog_mix",
        };

        recMetaMap.set(baseProduct.id, recMeta);
        if (productSlug) {
          recMetaMap.set(productSlug, recMeta);
        }
        preferred.push({ ...baseProduct, recMeta });
      }

      const annotated = productsWithRecMeta.map((product) => {
        const meta = recMetaMap.get(product.id) ?? (product.slug ? recMetaMap.get(product.slug) : undefined);
        return meta ? { ...product, recMeta: meta } : product;
      });

      if (preferred.length >= MIN_RECS_FOR_INTERLEAVE) {
        const others = annotated.filter(
          (product) => !(recMetaMap.has(product.id) || (product.slug && recMetaMap.has(product.slug))),
        );
        const stride = computeAdaptiveStride(preferred.length, others.length, recRes.treatment ?? "control");
        const interleaved = interleaveWithDiversification([...preferred], [...others], stride);
        productsForClient = interleaved.map((product, index) => ({ ...product, order: index }));
      } else {
        productsForClient = annotated;
      }
    }
  }



  if (fetchError && !products.length) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-gray-900">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="mt-4 text-red-500">Failed to load products: {String((fetchError as any)?.message ?? fetchError)}</p>
        <Link href="/" className="mt-6 inline-flex items-center text-sm text-blue-500 hover:text-blue-400">
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {structuredData ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}
      <ProductsClient
        products={productsForClient}
        categories={categories}
        catalogName={catalogName}
        initialQuery={filters.query}
        initialCategory={filters.category}
        initialBrand={filters.brand}
        initialModel={filters.model}
        initialDataset={filters.dataset}
        initialSort={filters.sort}
        initialPriceMin={filters.priceMin}
        initialPriceMax={filters.priceMax}
        initialMinRating={filters.minRating}
        totalAvailable={totalCount}
      />
    </main>
  );
}
