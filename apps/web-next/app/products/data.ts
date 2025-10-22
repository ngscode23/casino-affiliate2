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

function mapStatusToAvailability(status: string | null | undefined): Product["availability"] {
  if (!status) return "InStock";
  const normalized = status.toLowerCase();
  if (["sold_out", "out_of_stock", "inactive", "archived", "disabled"].includes(normalized)) {
    return "OutOfStock";
  }
  if (["preorder", "pre_order", "pre-order", "coming_soon"].includes(normalized)) {
    return "PreOrder";
  }
  return "InStock";
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
    .from("products")
    .select("id, slug, title, description, price_cents, currency, main_image_url, status, category_slug, created_at, tags")
    .in("status", ["active", "published"])
    .order("created_at", { ascending: false });

  if (error || !data) {
    return {
      products: [],
      fetchError: error,
      structuredData: null,
      categories: [],
      catalogName: CATALOG_NAME,
    };
  }

  const now = Date.now();

  const products: Product[] = data.map((row, index) => {
    const createdAt = row.created_at ?? null;
    const createdTime = createdAt ? Date.parse(createdAt) : NaN;
    const isNew = Number.isFinite(createdTime) ? createdTime >= now - NEW_WINDOW_MS : index < TOP_LIMIT;

    const priceCents = Number(row.price_cents ?? 0);
    const price = priceCents / 100;
    const currency = (row.currency ?? "EUR").toUpperCase();
    const mainImage = normalizeImageUrl(row.main_image_url) ?? getFallbackImageByKey(String(row.id ?? ""));

    return {
      id: String(row.id ?? ""),
      slug: String(row.slug ?? ""),
      title: String(row.title ?? ""),
      description: row.description ? String(row.description) : null,
      price,
      currency,
      mainImage,
      clicks: 0,
      impressions: 0,
      dataset: "shop",
      order: index,
      createdAt,
      isNew,
      isTop: false,
      availability: mapStatusToAvailability(row.status ?? null),
      categorySlug: row.category_slug ? String(row.category_slug) : null,
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
