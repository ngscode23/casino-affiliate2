import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import ProductsClient from "./products-client";
import { CATALOG_NAME, loadProductsData } from "./data";
import { serializeJsonLd } from "@shared/lib/jsonld";
import { resolveFilterParams } from "./filter-params";
import { fetchUserProfile } from "@/lib/personalization/rank";

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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = resolveFilterParams(resolvedSearchParams);
  const headerStore = new Headers(await headers());
  const experimentCookieName = process.env.EXPERIMENT_COOKIE_NAME || "exp";

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

  const { products, fetchError, structuredData, categories, catalogName, totalCount } = await loadProductsData(
    {
      query: filters.query,
      category: filters.category !== "all" ? filters.category : undefined,
      dataset: filters.dataset,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      minRating: filters.minRating,
      sort: filters.sort,
    },
    {
      personalize: {
        profile,
        country: country ?? undefined,
        device,
        experimentVariant: experimentVariant ?? undefined,
      },
    },
  );

  if (fetchError && !products.length) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="mt-4 text-red-500">Failed to load products: {String((fetchError as any)?.message ?? fetchError)}</p>
        <Link href="/" className="mt-6 inline-flex items-center text-sm text-blue-400 hover:text-blue-300">
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {structuredData ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}
      <section>
        <div className="mx-auto max-w-screen-xl space-y-6 px-6 pt-12 pb-0 sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
          <header className="flex flex-col gap-3 text-center sm:text-left">
            <span className="text-sm font-medium text-muted">Product catalog</span>
            <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{catalogName}</h1>
            {/* <p className="text-base text-muted sm:max-w-3xl">
              Explore curated drops across hardware, merch, and legacy releases. Filter by dataset, category, or popularity metrics to see which tools teams rely on most, then dive into real impressions and clickthrough data before you decide.
            </p> */}
            {/* <ul className="mt-2 flex flex-col gap-2 text-sm text-muted sm:max-w-3xl sm:text-base">
              <li>
                • Fast shipping on in-stock Neon Shop gear worldwide with tracked delivery.
              </li>
              <li>
                • Category spotlights highlight best-selling collections like accessories, apparel, and launch bundles.
              </li>
              <li>
                • Legacy archive stays available for reference—perfect for comparing specs or revisiting earlier drops.
              </li>
            </ul> */}
          </header>
        </div>
        <ProductsClient
          products={products}
          categories={categories}
          catalogName={catalogName}
          initialQuery={filters.query}
          initialCategory={filters.category}
          initialDataset={filters.dataset}
          initialSort={filters.sort}
          initialPriceMin={filters.priceMin}
          initialPriceMax={filters.priceMax}
          initialMinRating={filters.minRating}
          totalAvailable={totalCount}
        />
      </section>
    </div>
  );
}
