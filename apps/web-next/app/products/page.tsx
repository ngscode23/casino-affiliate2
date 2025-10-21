import type { Metadata } from "next";
import Link from "next/link";
import ProductsClient from "./products-client";
import { loadProductsData } from "./data";
import { serializeJsonLd } from "@shared/lib/jsonld";

export const metadata: Metadata = {
  title: "Product catalog - Neon Shop",
  description: "Browse the latest store products with real-time click and impression stats powered by Supabase.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Product catalog - Neon Shop",
    description: "Browse the latest store products with real-time click and impression stats powered by Supabase.",
    url: "/products",
  },
};

export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { products, fetchError, structuredData } = await loadProductsData();

  if (!products.length) {
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

  const initialQuery = (() => {
    const raw = resolvedSearchParams?.q;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && raw.length > 0) return raw[0] ?? "";
    return "";
  })();

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
            <h1 className="text-3xl font-semibold text-fg sm:text-4xl">Discover our latest selection</h1>
            <p className="text-base text-muted sm:max-w-2xl">
              Explore curated drops, track real-time performance, and find the right Neon gear for your next project.
            </p>
          </header>
        </div>
        <ProductsClient products={products} initialQuery={initialQuery} />
      </section>
    </div>
  );
}
