import { unstable_cache } from "next/cache";
import { getAdminClient } from "@/utils/supabase/admin";
import { getFallbackImageByKey } from "./fallback-images";
import { normalizeImageUrl } from "./[slug]/data";
import type { Product } from "./types";
import { formatCurrency } from "./currency";
import { resolveCurrency, resolvePriceDetails } from "./price-utils";

export type CategorySummary = { slug: string; label: string; count: number };

export const CATALOG_NAME = "Neon Shop Product Catalog";
export const PRODUCT_LIST_REVALIDATE_SECONDS = 1;
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
  const { data, error } = await supabase
    .from("product_with_discount_public")
    .select("id, sku, name, slug, basePriceCents, effectivePriceCents, hasDiscount, currency, category_slug, rating, created_at, thumbnail, thumbnail_path")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(DEFAULT_LIST_LIMIT);

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
    const titleSource = row?.title ?? row?.name ?? "";
    const title = titleSource != null ? String(titleSource) : "";
    const createdAtRaw = row?.created_at ?? row?.createdAt ?? null;
    const createdAt = typeof createdAtRaw === "string" ? createdAtRaw : null;
    const createdTime = createdAt ? Date.parse(createdAt) : NaN;
    const isNew = Number.isFinite(createdTime) ? createdTime >= now - NEW_WINDOW_MS : index < TOP_LIMIT;

    const priceDetails = resolvePriceDetails(row as Record<string, unknown>);
    const currencyResolved = resolveCurrency(row as Record<string, unknown>);
    const normalizedPrice = priceDetails.price;
    const normalizedPriceCents = Number.isFinite(priceDetails.priceCents)
      ? priceDetails.priceCents
      : Math.round(normalizedPrice * 100);
    const currencyRaw = (currencyResolved ?? DEFAULT_CURRENCY).toUpperCase();
    const thumbnailPath = (() => {   
         if (typeof row?.thumbnail === "string" && row.thumbnail.trim()) return row.thumbnail.trim();  
             if (typeof row?.thumbnail_path === "string" && row.thumbnail_path.trim())
               return row.thumbnail_path.trim();
            return null;   
           })
            ();
    const fallbackKey = slug || id || String(index);
    const mainImage = thumbnailPath? normalizeImageUrl(thumbnailPath) ?? getFallbackImageByKey(fallbackKey) : getFallbackImageByKey(fallbackKey);
    const rating =
      typeof row?.rating === "number" && Number.isFinite(row.rating) ? Number(row.rating) : null;
    const categorySlug = (() => {
      const value =
        (typeof row?.category_slug === "string" && row.category_slug.trim()
          ? row.category_slug
          : typeof (row as Record<string, unknown>)?.categorySlug === "string"
            ? (row as Record<string, unknown>).categorySlug
            : null) ?? null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
      }
      return null;
    })();

    return {
      id,
      slug,
      title,
      description: typeof row?.description === "string" ? row.description : null,
      price: normalizedPrice,
      priceCents: normalizedPriceCents,
      originalPrice: priceDetails.originalPrice,
      originalPriceCents: priceDetails.originalPriceCents,
      discountPercent: priceDetails.discountPercent,
      discountAmountCents: priceDetails.discountAmountCents,
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

  if (process.env.NODE_ENV !== "production") {
    try {
      for (const p of products) {
        console.debug("catalog:image", {
          id: p.id,
          sku: p.slug,
          slug: p.slug,
          image: p.mainImage,
          source: "product_with_discount_public",
        });
      }
    } catch {
      // no-op debug hook
    }
  }

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








