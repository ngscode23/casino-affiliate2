import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/utils/supabase/server";

import ProductsClient from "./products-client";
import type { Product } from "./types";
import { getFallbackImage } from "./fallback-images";

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

type RawProduct = {
  id: string;
  slug: string;
  title: string;
  short_desc: string | null;
  price: number | null;
  images: unknown;
  status?: string | null;
};

function extractImage(images: unknown): string | null {
  if (!images) return null;
  if (typeof images === "string") return images || null;
  if (Array.isArray(images)) {
    for (const entry of images) {
      if (typeof entry === "string" && entry) return entry;
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const candidate = (record.url ?? record.src ?? record.href) as string | undefined;
        if (candidate) return candidate;
      }
    }
  }
  return null;
}

async function fetchProducts() {
  const supabase = await createClient();

  let rawProducts: RawProduct[] = [];
  let dataset: "shop" | "legacy" = "shop";
  let fetchError: unknown = null;

  try {
    const { data, error } = await supabase
      .from("ecom_products")
      .select("id, slug, title, short_desc, price, images, status")
      .order("created_at", { ascending: false });
    if (!error && data) {
      rawProducts = (data as RawProduct[]).filter((row) => row.status !== "archived");
    } else {
      fetchError = error;
    }
  } catch (err) {
    fetchError = err;
  }

  if (!rawProducts.length) {
    dataset = "legacy";
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, title, description, price_cents, currency, main_image_url, status")
        .order("created_at", { ascending: false });
      if (!error && data) {
        rawProducts = (data as any[])
          .filter((row) => (row?.status ?? "active") === "active")
          .map((row) => ({
            id: String(row.id),
            slug: String(row.slug),
            title: String(row.title ?? ""),
            short_desc: (row.description as string) ?? null,
            price: typeof row.price_cents === "number" ? row.price_cents / 100 : null,
            images: row.main_image_url ?? null,
            status: row.status ?? "active",
          } satisfies RawProduct));
        fetchError = null;
      } else if (error) {
        fetchError = error;
      }
    } catch (err) {
      fetchError = err;
    }
  }

  return { rawProducts, dataset, fetchError, supabase } as const;
}

async function fetchStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productIds: string[],
): Promise<{ clicks: Map<string, number>; impressions: Map<string, number> }> {
  const clicks = new Map<string, number>();
  const impressions = new Map<string, number>();

  if (!productIds.length) {
    return { clicks, impressions };
  }

  try {
    let clicksRes = await supabase.from("shop_clicks").select("product_id").in("product_id", productIds);
    if (clicksRes.error) {
      clicksRes = await supabase.from("product_clicks").select("product_id").in("product_id", productIds);
    }

    let impressionsRes = await supabase
      .from("shop_impressions")
      .select("product_id")
      .in("product_id", productIds);
    if (impressionsRes.error) {
      impressionsRes = await supabase.from("product_impressions").select("product_id").in("product_id", productIds);
    }

    if (!clicksRes.error) {
      for (const row of (clicksRes.data as any[] | null | undefined) ?? []) {
        const id = String((row as any)?.product_id ?? "");
        if (!id) continue;
        clicks.set(id, (clicks.get(id) ?? 0) + 1);
      }
    }

    if (!impressionsRes.error) {
      for (const row of (impressionsRes.data as any[] | null | undefined) ?? []) {
        const id = String((row as any)?.product_id ?? "");
        if (!id) continue;
        impressions.set(id, (impressions.get(id) ?? 0) + 1);
      }
    }
  } catch {
    // Ignore stats errors – UI will fallback to zeros.
  }

  return { clicks, impressions };
}

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { rawProducts, dataset, fetchError, supabase } = await fetchProducts();

  if (!rawProducts.length) {
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

  const productIds = rawProducts.map((raw) => raw.id);
  const stats = await fetchStats(supabase, productIds);

  const products: Product[] = rawProducts.map((raw, index) => ({
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.short_desc ?? null,
    price: raw.price ?? 0,
    mainImage: extractImage(raw.images) ?? getFallbackImage(index),
    clicks: stats.clicks.get(raw.id) ?? 0,
    impressions: stats.impressions.get(raw.id) ?? 0,
    dataset,
    order: index,
  }));

  const rawOrigin = process.env.NEXT_SITE_URL ?? "";
  const base = rawOrigin.replace(/\/$/, "");
  const hasBase = base.length > 0;
  const listUrl = hasBase ? base + "/products" : "/products";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Product catalog",
    url: listUrl,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: hasBase ? base + "/products/" + product.slug : "/products/" + product.slug,
      name: product.title,
      image: product.mainImage ?? undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: Number.isFinite(product.price) ? product.price.toFixed(2) : "0.00",
        availability: "https://schema.org/InStock",
      },
    })),
  } satisfies Record<string, unknown>;

  return (
    <div className="px-4 py-6 md:px-6 xl:px-8">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ProductsClient products={products} />
    </div>
  );
}
