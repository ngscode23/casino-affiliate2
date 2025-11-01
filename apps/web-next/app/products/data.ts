import { unstable_cache } from "next/cache";
import { getAdminClient } from "@/utils/supabase/admin";
import { getFallbackImageByKey } from "./fallback-images";
import type { Product } from "./types";
import { normalizeImageUrl, formatCurrency } from "./[slug]/data";

export type CategorySummary = { slug: string; label: string; count: number };

export const CATALOG_NAME = "Neon Shop Product Catalog";
export const PRODUCT_LIST_REVALIDATE_SECONDS = 90;
const PRODUCT_COLLECTION_TAG = "products:list";
const CATEGORY_TAG_PREFIX = "category:";

const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;
const TOP_LIMIT = 6;
const DEFAULT_LIST_LIMIT = 240;
const DEFAULT_CURRENCY = "EUR";

function categoryTag(slug: string) {
  return `${CATEGORY_TAG_PREFIX}${slug}`;
}

function humanizeSlug(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildStructuredData(products: Product[]) {
  const rawOrigin = process.env.NEXT_SITE_URL ?? "";
  const base = rawOrigin.replace(/\/$/, "");
  const hasBase = base.length > 0;
  const listUrl = hasBase ? `${base}/products` : "/products";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: CATALOG_NAME,
    url: listUrl,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: hasBase ? `${base}/products/${product.slug}` : `/products/${product.slug}`,
      name: product.title,
      image: product.mainImage ?? undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: product.currency || "EUR",
        price: Number.isFinite(product.price) ? product.price.toFixed(2) : "0.00",
        availability: `https://schema.org/${product.availability}`,
      },
    })),
  } satisfies Record<string, unknown>;
}

async function loadProductsDataInternal(): Promise<{
  products: Product[];
  fetchError: unknown;
  structuredData: Record<string, unknown> | null;
  categories: CategorySummary[];
  catalogName: string;
}> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("api_catalog_list", {
    _category: null,
    _limit: DEFAULT_LIST_LIMIT,
    _offset: 0,
  });

  if (error || !Array.isArray(data)) {
    return {
      products: [],
      fetchError: error,
      structuredData: null,
      categories: [],
      catalogName: CATALOG_NAME,
    };
  }

  const now = Date.now();

  const products: Product[] = data.map((row: any, index) => {
    const id = row?.id != null ? String(row.id) : "";
    const slug = row?.slug != null ? String(row.slug) : "";
    const title = row?.title != null ? String(row.title) : "";
    const createdAt = typeof row?.created_at === "string" ? row.created_at : null;
    const createdTime = createdAt ? Date.parse(createdAt) : NaN;
    const isNew = Number.isFinite(createdTime) ? createdTime >= now - NEW_WINDOW_MS : index < TOP_LIMIT;

    const priceValue = typeof row?.price === "number" ? row.price : Number(row?.price ?? 0);
    const normalizedPrice = Number.isFinite(priceValue) ? Math.max(priceValue, 0) : 0;
    const currencyRaw =
      typeof row?.currency === "string" && row.currency.trim() ? row.currency.trim().toUpperCase() : DEFAULT_CURRENCY;
    const thumbnailPath =
      typeof row?.thumbnail_path === "string" && row.thumbnail_path.trim() ? row.thumbnail_path.trim() : null;
    const fallbackKey = slug || id || String(index);
    const mainImage = normalizeImageUrl(thumbnailPath) ?? getFallbackImageByKey(fallbackKey);
    const rating =
      typeof row?.rating === "number" && Number.isFinite(row.rating) ? Number(row.rating) : null;
    const categorySlug =
      typeof row?.category_slug === "string" && row.category_slug.trim() ? row.category_slug.trim() : null;

    return {
      id,
      slug,
      title,
      description: null,
      price: normalizedPrice,
      currency: currencyRaw,
      mainImage,
      thumbnailPath,
      rating,
      clicks: 0,
      impressions: 0,
      dataset: "shop",
      order: index,
      createdAt,
      isNew,
      isTop: false,
      availability: "InStock",
      categorySlug,
    } satisfies Product;
  });

  // Mark top products by recency for now.
  for (let i = 0; i < Math.min(TOP_LIMIT, products.length); i += 1) {
    products[i].isTop = true;
  }

  const categories = (() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const product of products) {
      const slug = product.categorySlug;
      if (!slug) continue;
      const label = humanizeSlug(slug);
      const entry = counts.get(slug);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(slug, { label, count: 1 });
      }
    }
    return Array.from(counts.entries())
      .map(([slug, value]) => ({ slug, label: value.label, count: value.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  })();

  const structuredData = buildStructuredData(products);

  return {
    products,
    fetchError: null,
    structuredData,
    categories,
    catalogName: CATALOG_NAME,
  };
}

export const loadProductsData = unstable_cache(
  () => loadProductsDataInternal(),
  ["products:list:data"],
  {
    revalidate: PRODUCT_LIST_REVALIDATE_SECONDS,
    tags: [PRODUCT_COLLECTION_TAG],
  },
);

export function formatPrice(priceCents: number | null | undefined, currency: string | null | undefined): string {
  const price = Number(priceCents ?? 0) / 100;
  const cur = (currency ?? "EUR").toUpperCase();
  return formatCurrency(price, cur);
}

