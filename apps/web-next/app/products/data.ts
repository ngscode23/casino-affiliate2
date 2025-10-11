import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/utils/supabase/admin";
import { getFallbackImageByKey } from "./fallback-images";
import type { Product } from "./types";

type Dataset = "shop" | "legacy";

export type RawProduct = {
  id: string;
  slug: string;
  title: string;
  short_desc: string | null;
  price: number | null;
  currency: string | null;
  images: unknown;
  image_path: string | null;
  status?: string | null;
  created_at?: string | null;
  category_slug?: string | null;
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

function humanizeSlug(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function deriveTitle(raw: RawProduct, index: number): string {
  const direct = typeof raw.title === "string" ? raw.title.trim() : "";
  if (direct.length) return direct;
  const slug = typeof raw.slug === "string" ? raw.slug : "";
  const fromSlug = humanizeSlug(slug);
  if (fromSlug.length) return fromSlug;
  return `Product ${index + 1}`;
}
const PLACEHOLDER_PATTERNS = [
  /dfbcgvh/i,
  /lorem/i,
  /ipsum/i,
  /dummy/i,
  /placeholder/i,
  /sample/i,
  /mock/i,
  /test(\b|_)/i,
  /untitled/i,
  /screenshot/i,
  /todo/i,
  /tbd/i,
];

function isPlaceholderProduct(product: Product): boolean {
  const title = (product.title ?? "").trim();
  if (title.length < 4) {
    return true;
  }
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(title))) {
    return true;
  }
  const description = product.description;
  if (typeof description === "string" && PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(description))) {
    return true;
  }
  if (product.price <= 0) {
    return true;
  }
  const image = (product.mainImage ?? "").toLowerCase();
  if (image && (image.includes("placeholder") || image.includes("screenshot") || image.includes("ide") || image.includes("dummy"))) {
    return true;
  }
  return false;
}

const PRODUCT_IMAGE_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET?.trim() || "product-images";
const SUPABASE_ORIGIN = (() => {
  const raw = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return raw.replace(/\/$/, "");
})();

function toStoragePublicUrl(path: string | null): string | null {
  if (!path || !SUPABASE_ORIGIN) return null;
  const normalized = path.replace(/^\/+/, "");
  const encodedPath = normalized
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${SUPABASE_ORIGIN}/storage/v1/object/public/${encodeURIComponent(PRODUCT_IMAGE_BUCKET)}/${encodedPath}`;
}

function normalizeImageUrl(input: string | null): string | null {
  if (!input) return null;
  if (/^https?:/i.test(input)) return input;
  return toStoragePublicUrl(input);
}

async function fetchRawProducts(supabase: SupabaseClient): Promise<{
  rawProducts: RawProduct[];
  dataset: Dataset;
  fetchError: unknown;
}> {
  let rawProducts: RawProduct[] = [];
  let dataset: Dataset = "shop";
  let fetchError: unknown = null;

  try {
    const { data, error } = await supabase
      .from("ecom_products")
      .select(
        "id, slug, title, short_desc, price, currency, images, image_path, status, created_at, category_slug",
      )
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
        .select("id, slug, title, description, price_cents, currency, main_image_url, status, created_at")
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
            currency: typeof row.currency === "string" ? String(row.currency).toUpperCase() : "USD",
            images: row.main_image_url ?? null,
            image_path: null,
            status: row.status ?? "active",
            created_at: typeof row.created_at === "string" ? row.created_at : null,
            category_slug: null,
          })) as RawProduct[];
        fetchError = null;
      } else if (error) {
        fetchError = error;
      }
    } catch (err) {
      fetchError = err;
    }
  }

  if (rawProducts.length) {
    rawProducts = rawProducts.filter((row) => {
      const status = String(row.status ?? "").toLowerCase();
      const priceValue = Number(row.price ?? 0);
      return (status === "published" || status === "active") && priceValue > 0;
    });

    rawProducts = rawProducts.map((row) => ({
      ...row,
      currency: typeof row.currency === "string" ? row.currency.toUpperCase() : dataset === "shop" ? "EUR" : "USD",
    }));
  }

  return { rawProducts, dataset, fetchError };
}

async function fetchStats(
  supabase: SupabaseClient,
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
    // Ignore stats errors - UI will fallback to zeros.
  }

  return { clicks, impressions };
}

const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;
const FALLBACK_NEW_LIMIT = 6;
const TOP_LIMIT = 6;

function buildStructuredData(products: Product[]) {
  const rawOrigin = process.env.NEXT_SITE_URL ?? "";
  const base = rawOrigin.replace(/\/$/, "");
  const hasBase = base.length > 0;
  const listUrl = hasBase ? base + "/products" : "/products";

  return {
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
        priceCurrency: product.currency || "EUR",
        price: Number.isFinite(product.price) ? product.price.toFixed(2) : "0.00",
        availability: "https://schema.org/InStock",
      },
    })),
  } satisfies Record<string, unknown>;
}

export async function loadProductsData(): Promise<{
  products: Product[];
  fetchError: unknown;
  structuredData: Record<string, unknown> | null;
}> {
  const supabase = getAdminClient();
  const { rawProducts, dataset, fetchError } = await fetchRawProducts(supabase);

  if (!rawProducts.length) {
    return { products: [], fetchError, structuredData: null };
  }

  const latestImages = new Map<string, string>();
  if (dataset === "shop") {
    const candidates = rawProducts.filter((row) => {
      const primary = normalizeImageUrl(extractImage(row.images));
      const byPath = normalizeImageUrl(row.image_path ?? null);
      return !primary && !byPath;
    });
    const idsNeedingImages = candidates.map((row) => row.id).filter(Boolean);
    if (idsNeedingImages.length) {
      try {
        const { data: latestRows, error: latestError } = await supabase
          .from("ecom_product_images_latest")
          .select("product_id, source_url")
          .in("product_id", idsNeedingImages);
        if (!latestError && Array.isArray(latestRows)) {
          for (const row of latestRows) {
            if (row?.product_id && typeof row.source_url === "string" && row.source_url.trim()) {
              const normalized = normalizeImageUrl(row.source_url.trim());
              if (normalized) {
                latestImages.set(String(row.product_id), normalized);
              }
            }
          }
        }
      } catch (latestError) {
        console.warn("products:data: latest image lookup failed", latestError);
      }
    }
  }

  const stats = await fetchStats(
    supabase,
    rawProducts.map((raw) => raw.id),
  );

  const now = Date.now();
  const usedLatestImages: string[] = [];
  const fallbackImagesUsed: string[] = [];

  let products: Product[] = rawProducts.map((raw, index) => {
    const slug = (typeof raw.slug === "string" ? raw.slug.trim() : "") || raw.id;
    const descriptionValue = typeof raw.short_desc === "string" ? raw.short_desc.trim() : "";
    const createdAt = typeof raw.created_at === "string" ? raw.created_at : null;
    const createdTime = createdAt ? Date.parse(createdAt) : NaN;
    const isNew = Number.isFinite(createdTime)
      ? createdTime >= now - NEW_WINDOW_MS
      : index < Math.min(FALLBACK_NEW_LIMIT, rawProducts.length);

    const currency = (raw.currency ?? (dataset === "shop" ? "EUR" : "USD")).toUpperCase();

    let mainImage: string | null = null;
    if (dataset === "shop") {
      const primary = normalizeImageUrl(extractImage(raw.images));
      mainImage = primary ?? normalizeImageUrl(raw.image_path ?? null);
      if (!mainImage) {
        const latest = latestImages.get(raw.id);
        if (latest) {
          mainImage = latest;
          usedLatestImages.push(raw.id);
        }
      }
    } else {
      mainImage = extractImage(raw.images);
    }
    if (!mainImage) {
      mainImage = getFallbackImageByKey(raw.id);
      fallbackImagesUsed.push(raw.id);
    }

    return {
      id: raw.id,
      slug,
      title: deriveTitle(raw, index),
      description: descriptionValue.length ? descriptionValue : null,
      price: Number(raw.price ?? 0),
      currency,
      mainImage,
      clicks: stats.clicks.get(raw.id) ?? 0,
      impressions: stats.impressions.get(raw.id) ?? 0,
      dataset,
      order: index,
      createdAt,
      isNew,
      isTop: false,
    } satisfies Product;
  });

  const cleanedProducts = products.filter((product) => !isPlaceholderProduct(product));
  if (cleanedProducts.length > 0) {
    products = cleanedProducts;
  }

  const topCandidates = products
    .filter((product) => (product.clicks ?? 0) > 0 || (product.impressions ?? 0) > 0)
    .sort((a, b) => {
      const clickDiff = (b.clicks || 0) - (a.clicks || 0);
      if (clickDiff !== 0) return clickDiff;
      const impressionDiff = (b.impressions || 0) - (a.impressions || 0);
      if (impressionDiff !== 0) return impressionDiff;
      return a.order - b.order;
    })
    .slice(0, TOP_LIMIT);

  const topIds = new Set(topCandidates.map((product) => product.id));
  for (const product of products) {
    if (topIds.has(product.id)) {
      product.isTop = true;
    }
  }

  products.sort((a, b) => {
    const clickDiff = (b.clicks || 0) - (a.clicks || 0);
    if (clickDiff !== 0) return clickDiff;
    const impressionDiff = (b.impressions || 0) - (a.impressions || 0);
    if (impressionDiff !== 0) return impressionDiff;
    return a.order - b.order;
  });

  console.info("[catalog:load]", {
    dataset,
    total_products: products.length,
    used_latest_image: usedLatestImages.length > 0,
    fallback_images: fallbackImagesUsed.length,
    currency_source: dataset === "shop" ? "ecom_products" : "legacy",
  });

  return { products, fetchError, structuredData: buildStructuredData(products) };
}




