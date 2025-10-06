import type { Metadata } from "next";
import Link from "next/link";

import ProductsClient from "./products-client";
import { loadProductsData } from "./data";

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

export const dynamic = "force-dynamic";

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
    <div className="overflow-x-hidden">
      {structuredData ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      ) : null}
      <div className="pt-6 pb-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-fg sm:text-2xl">Products</h1>
        </header>
        <ProductsClient products={products} initialQuery={initialQuery} />
      </div>
    </div>
  );
}
