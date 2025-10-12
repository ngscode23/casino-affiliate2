import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/utils/supabase/admin";
import type { ProductGridItem } from "@/components/ProductGrid";
import { getFallbackImageByKey } from "../fallback-images";

const PRODUCT_IMAGE_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET?.trim() || "product-images";
const SUPABASE_ORIGIN = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");

export type ProductVariantOption = {
  value: string;
  label: string;
  disabled?: boolean;
  image?: string | null;
  priceDelta?: number | null;
};

export type ProductVariantGroup = {
  id: string;
  label: string;
  options: ProductVariantOption[];
};

export type ProductSpecsCard = {
  title: string;
  items: string[];
};

export type ProductSpecsData = {
  highlights: string[];
  attributes: Array<{ key: string; value: string }>;
  cards: ProductSpecsCard[];
  inTheBox: string[];
  warranty: string[];
};

export type ProductReviewSummary = {
  average: number;
  count: number;
};

function normalizeAverageRating(input: number | null | undefined, fallback = 0): number {
  const raw = Number(input ?? fallback ?? 0);
  if (!Number.isFinite(raw)) return Number(fallback) || 0;
  let value = raw;
  if (value > 5 && value <= 100) {
    value = value / 20;
  }
  if (value < 0) value = 0;
  if (value > 5) value = 5;
  return Number(value.toFixed(2));
}

export type ProductReviewPreview = {
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  authorLabel: string;
};

export type ProductData = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  currency: string;
  formattedPrice: string;
  gallery: string[];
  mainImage: string;
  fallbackImage: string;
  dataset: "shop" | "legacy";
  status: string;
  sku?: string | null;
  category: { slug: string | null; name: string | null };
  tags: string[];
  specs: ProductSpecsData;
  variants: ProductVariantGroup[];
  shippingEstimate: string | null;
  availabilityLabel: string;
  reviewSummary: ProductReviewSummary;
  recentReviews: ProductReviewPreview[];
  productUid: string | null;
  brand: string | null;
};

function toStoragePublicUrl(path: string | null | undefined): string | null {
  if (!path || !SUPABASE_ORIGIN) return null;
  const normalized = path.replace(/^\/+/, "");
  const encodedPath = normalized
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${SUPABASE_ORIGIN}/storage/v1/object/public/${encodeURIComponent(PRODUCT_IMAGE_BUCKET)}/${encodedPath}`;
}

export function normalizeImageUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  if (/^https?:/i.test(input)) return input;
  return toStoragePublicUrl(input);
}

function castString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(castString).filter(Boolean).join(", ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

function toStringArray(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((entry) => castString(entry).trim())
      .filter((entry) => Boolean(entry));
  }
  if (typeof input === "string") {
    return input
      .split(/[;,\n]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function dedupe<T>(values: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = typeof value === "string" ? value : JSON.stringify(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function extractImages(source: unknown): string[] {
  const result: string[] = [];
  if (!source) return result;

  const push = (value: unknown) => {
    const normalized = normalizeImageUrl(typeof value === "string" ? value : castString(value));
    if (normalized) result.push(normalized);
  };

  if (typeof source === "string") {
    push(source);
    return dedupe(result);
  }

  if (Array.isArray(source)) {
    for (const entry of source) {
      if (typeof entry === "string") {
        push(entry);
        continue;
      }
      if (entry && typeof entry === "object") {
        const candidate =
          (entry as Record<string, unknown>).url ??
          (entry as Record<string, unknown>).src ??
          (entry as Record<string, unknown>).href ??
          (entry as Record<string, unknown>).image;
        push(candidate);
      }
    }
    return dedupe(result);
  }

  if (source && typeof source === "object") {
    const candidate =
      (source as Record<string, unknown>).url ??
      (source as Record<string, unknown>).src ??
      (source as Record<string, unknown>).href ??
      (source as Record<string, unknown>).image;
    push(candidate);
  }

  return dedupe(result);
}

function mergeGallery(mainImage: string, extras: string[], fallback: string): string[] {
  const list = [mainImage, ...extras, fallback];
  return dedupe(list.filter(Boolean));
}

function isPairLike(value: unknown): value is { key?: string; name?: string; value?: unknown; label?: string } {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return "key" in entry || "name" in entry || "label" in entry;
}

function normalizeAttributes(source: unknown): Array<{ key: string; value: string }> {
  const attributes: Array<{ key: string; value: string }> = [];
  if (!source) return attributes;

  if (Array.isArray(source)) {
    for (const entry of source) {
      if (isPairLike(entry)) {
        const key = castString(entry.key ?? entry.name ?? entry.label).trim();
        const value = castString((entry as Record<string, unknown>).value ?? "").trim();
        if (key && value) attributes.push({ key, value });
        continue;
      }
      if (Array.isArray(entry) && entry.length >= 2) {
        const key = castString(entry[0]).trim();
        const value = castString(entry[1]).trim();
        if (key && value) attributes.push({ key, value });
        continue;
      }
      if (entry && typeof entry === "object") {
        for (const [keyRaw, valueRaw] of Object.entries(entry)) {
          const key = castString(keyRaw).trim();
          const value = castString(valueRaw).trim();
          if (key && value) attributes.push({ key, value });
        }
      }
    }
    return attributes;
  }

  if (typeof source === "object") {
    for (const [keyRaw, valueRaw] of Object.entries(source as Record<string, unknown>)) {
      const key = castString(keyRaw).trim();
      const value = castString(valueRaw).trim();
      if (key && value) attributes.push({ key, value });
    }
  }

  return attributes;
}

function parseVariantOptions(input: unknown, labelFallback: string): ProductVariantOption[] {
  const options: ProductVariantOption[] = [];
  if (!input) return options;

  const pushOption = (value: {
    raw: unknown;
    label?: unknown;
    disabled?: unknown;
    image?: unknown;
    priceDelta?: unknown;
  }) => {
    const optionValue = castString(value.raw).trim();
    const optionLabel = castString(value.label ?? value.raw).trim() || optionValue || labelFallback;
    if (!optionValue && !optionLabel) return;
    options.push({
      value: optionValue || optionLabel,
      label: optionLabel,
      disabled: Boolean(value.disabled === true || (typeof value.disabled === "string" && value.disabled === "true")),
      image: normalizeImageUrl(castString(value.image)),
      priceDelta: value.priceDelta == null ? null : Number(value.priceDelta),
    });
  };

  if (Array.isArray(input)) {
    for (const entry of input) {
      if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        pushOption({
          raw: obj.value ?? obj.slug ?? obj.id ?? obj.label ?? obj.name ?? obj.title,
          label: obj.label ?? obj.name ?? obj.title,
          disabled: obj.disabled ?? obj.isDisabled ?? obj.unavailable,
          image: obj.image ?? obj.img ?? obj.photo ?? obj.url,
          priceDelta: obj.price_delta ?? obj.priceDelta ?? obj.price,
        });
        continue;
      }
      pushOption({ raw: entry });
    }
    return options;
  }

  if (typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (Array.isArray(value) || (value && typeof value === "object")) {
        pushOption({
          raw: key,
          label: value && typeof value === "object" ? (value as Record<string, unknown>).label ?? key : key,
          image: (value as Record<string, unknown> | undefined)?.image,
          priceDelta: (value as Record<string, unknown> | undefined)?.price,
          disabled: (value as Record<string, unknown> | undefined)?.disabled,
        });
      } else {
        pushOption({ raw: key, label: value });
      }
    }
    return options;
  }

  pushOption({ raw: input });
  return options;
}

function parseVariants(source: Record<string, unknown>): ProductVariantGroup[] {
  const groups: ProductVariantGroup[] = [];

  const pushGroup = (id: string, label: string, raw: unknown) => {
    const options = parseVariantOptions(raw, label);
    if (!options.length) return;
    groups.push({ id, label, options });
  };

  const direct = source.variants ?? source.options;
  if (Array.isArray(direct)) {
    for (const entry of direct) {
      if (!entry || typeof entry !== "object") continue;
      const obj = entry as Record<string, unknown>;
      const id = castString(obj.id ?? obj.name ?? obj.label ?? `option-${groups.length + 1}`).trim();
      const label = castString(obj.label ?? obj.name ?? id).trim() || `Option ${groups.length + 1}`;
      const options = parseVariantOptions(obj.options ?? obj.values, label);
      if (options.length) {
        groups.push({ id: id || `variant-${groups.length + 1}`, label, options });
      }
    }
  }

  const map: Array<[string, string]> = [
    ["colors", "Цвет"],
    ["colour", "Цвет"],
    ["color", "Цвет"],
    ["storage", "Память"],
    ["memory", "Память"],
    ["size", "Размер"],
    ["sizes", "Размер"],
  ];

  for (const [key, label] of map) {
    if (source[key] && !groups.some((group) => group.id === key)) {
      pushGroup(key, label, source[key]);
    }
  }

  return groups;
}

function pickBrand(source: Record<string, unknown>): string | null {
  const brandKeys = ["brand", "manufacturer", "maker", "vendor"];
  for (const key of brandKeys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function parseSpecsPayload(source: unknown): {
  specs: ProductSpecsData;
  variants: ProductVariantGroup[];
  brand: string | null;
  shippingEstimate: string | null;
} {
  const root = source && typeof source === "object" && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : {};

  const highlights = toStringArray(
    root.highlights ??
      root.bullets ??
      root.features ??
      root.summary ??
      root.key_features
  );
  const inTheBox = toStringArray(
    root.whats_in_the_box ??
      root.in_the_box ??
      root.inBox ??
      root.box ??
      root.package_contents
  );
  const warranty = toStringArray(
    root.warranty ??
      root.guarantee ??
      root.return_policy ??
      root.support
  );

  const attributesRaw =
    root.attributes ??
    root.specs ??
    root.details ??
    root.tech ??
    root.characteristics;
  const attributes = normalizeAttributes(attributesRaw);

  const cards: ProductSpecsCard[] = [];
  const cardsSource = root.cards ?? root.extra_cards ?? root.sections;
  if (Array.isArray(cardsSource)) {
    for (const entry of cardsSource) {
      if (!entry || typeof entry !== "object") continue;
      const obj = entry as Record<string, unknown>;
      const title = castString(obj.title ?? obj.name ?? "").trim();
      const items = toStringArray(
        obj.items ?? obj.points ?? obj.lines ?? obj.text ?? obj.list
      );
      if (title && items.length) {
        cards.push({ title, items });
      }
    }
  } else if (cardsSource && typeof cardsSource === "object") {
    for (const [key, value] of Object.entries(
      cardsSource as Record<string, unknown>
    )) {
      const title = castString(key).trim();
      const items = toStringArray(value);
      if (title && items.length) {
        cards.push({ title, items });
      }
    }
  }

  if (!cards.length) {
    if (inTheBox.length) cards.push({ title: "Что в коробке", items: inTheBox });
    if (warranty.length) {
      cards.push({ title: "Гарантия и возврат", items: warranty });
    }
  }

  const variants = parseVariants(root);
  const brand = pickBrand(root);
  const shippingEstimateRaw = castString(
    root.shipping_estimate ??
      root.delivery_estimate ??
      root.delivery ??
      root.eta
  ).trim();

  return {
    specs: {
      highlights,
      attributes,
      cards,
      inTheBox,
      warranty,
    },
    variants,
    brand,
    shippingEstimate: shippingEstimateRaw || null,
  };
}

const FALLBACK_LOCALE = "ru-RU";

export function formatCurrency(value: number, currency = "EUR", locale = FALLBACK_LOCALE): string {
  try {
    return new Intl.NumberFormat(locale || FALLBACK_LOCALE, {
      style: "currency",
      currency: currency || "EUR",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return `${value?.toFixed?.(2) ?? "0.00"} ${currency || "EUR"}`;
  }
}

async function resolveCategory(
  admin: SupabaseClient,
  slug: string | null
): Promise<{ slug: string | null; name: string | null }> {
  if (!slug) return { slug: null, name: null };
  try {
    const { data, error } = await admin
      .from("ecom_categories")
      .select("name")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { slug, name: null };
    return { slug, name: data?.name ?? null };
  } catch {
    return { slug, name: null };
  }
}

async function resolveProductUid(
  admin: SupabaseClient,
  sourceSchema: string,
  sourceTable: string,
  sourcePk: string
): Promise<string | null> {
  if (!sourceSchema || !sourceTable || !sourcePk) return null;
  try {
    const { data, error } = await admin
      .from("product_catalog")
      .select("product_uid")
      .eq("source_schema", sourceSchema)
      .eq("source_table", sourceTable)
      .eq("source_pk", sourcePk)
      .maybeSingle();
    if (error) return null;
    return data?.product_uid ?? null;
  } catch {
    return null;
  }
}

function anonymizeReviewer(userId: string | null | undefined): string {
  if (!userId) return "Customer";
  const cleaned = userId.replace(/[^a-z0-9]/gi, "");
  const suffix = cleaned.slice(-4) || cleaned.slice(0, 4);
  if (!suffix) return "Customer";
  return `Customer ${suffix.toUpperCase()}`;
}

async function loadReviewSummary(
  admin: SupabaseClient,
  productUid: string | null,
  fallbackRating: number | null
): Promise<ProductReviewSummary> {
  if (!productUid) {
    return {
      average: 0,
      count: 0,
    };
  }
  try {
    const { data, error } = await admin
      .from("product_rating_stats")
      .select("avg_rating, ratings_count")
      .eq("product_uid", productUid)
      .maybeSingle();
    if (error || !data) {
      return {
        average: 0,
        count: 0,
      };
    }
    const avg = normalizeAverageRating(data.avg_rating, fallbackRating ?? 0);
    const count = Number(data.ratings_count ?? 0);
    return {
      average: Number.isFinite(count) && count > 0 ? avg : 0,
      count: Number.isFinite(count) ? count : 0,
    };
  } catch {
    return {
      average: 0,
      count: 0,
    };
  }
}

async function loadRecentReviews(
  admin: SupabaseClient,
  productUid: string | null,
  limit = 2
): Promise<ProductReviewPreview[]> {
  if (!productUid) return [];
  try {
    const { data, error } = await admin
      .from("product_reviews_raw")
      .select("user_id, rating, title, body, created_at")
      .eq("product_id", productUid)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    const result: ProductReviewPreview[] = [];
    for (const row of data as any[]) {
      const textBody = typeof row.body === "string" ? row.body.trim() : "";
      if (!textBody) continue;
      const rating = Number(row.rating ?? 0);
      const created = typeof row.created_at === "string" ? row.created_at : new Date().toISOString();
      const title = typeof row.title === "string" ? row.title : null;
      const author = anonymizeReviewer(typeof row.user_id === "string" ? row.user_id : null);
      result.push({
        rating: Number.isFinite(rating) ? rating : 0,
        title,
        body: textBody.slice(0, 1200),
        createdAt: created,
        authorLabel: author,
      });
    }
    return result.slice(0, limit);
  } catch {
    return [];
  }
}

async function fetchGalleryImages(
  admin: SupabaseClient,
  productId: string
): Promise<string[]> {
  try {
    const { data, error } = await admin
      .from("ecom_product_image_versions")
      .select("source_url, path")
      .eq("product_id", productId)
      .eq("is_current", true)
      .order("uploaded_at", { ascending: true })
      .limit(12);
    if (error || !data) return [];
    const images = data
      .map((row) => normalizeImageUrl(row.source_url) ?? normalizeImageUrl(row.path))
      .filter((url): url is string => Boolean(url));
    return dedupe(images);
  } catch {
    return [];
  }
}

function resolveAvailabilityLabel(
  status: string | null,
  fallbackEstimate: string | null
): string {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "preorder" || normalized === "pre-order") {
    return `Предзаказ • ${fallbackEstimate ?? "доставка уточняется"}`;
  }
  if (normalized === "out_of_stock" || normalized === "unavailable") {
    return "Нет в наличии";
  }
  return `В наличии • ${fallbackEstimate ?? "2–4 дня"}`;
}

type PrimaryRow = {
  id: string;
  slug: string;
  title: string;
  short_desc: string | null;
  description?: string | null;
  price: number | null;
  currency: string | null;
  images: unknown;
  image_path: string | null;
  status: string | null;
  category_slug: string | null;
  tags: string[] | null;
  specs: unknown;
  rating: number | null;
  sku?: string | null;
};

type LegacyRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price_cents: number | null;
  currency: string | null;
  main_image_url: string | null;
  status: string | null;
};

function toStringTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => castString(entry).trim())
    .filter(Boolean);
}

function ensureStatus(status: string | null): string {
  return (status ?? "").toLowerCase() || "active";
}

function ensureCurrency(currency: string | null, dataset: "shop" | "legacy"): string {
  const fallback = dataset === "legacy" ? "USD" : "EUR";
  const normalized = (currency ?? "").toUpperCase();
  return normalized || fallback;
}

async function buildGallery(
  admin: SupabaseClient,
  dataset: "shop" | "legacy",
  row: PrimaryRow | LegacyRow
): Promise<{ mainImage: string; gallery: string[]; fallback: string }> {
  const fallback = getFallbackImageByKey(row.id);
  if (dataset === "shop") {
    const primaryList = extractImages((row as PrimaryRow).images);
    const pathImage = normalizeImageUrl((row as PrimaryRow).image_path);
    const versions = await fetchGalleryImages(admin, row.id);
    const main = primaryList[0] ?? pathImage ?? versions[0] ?? fallback;
    const extras = dedupe([
      ...primaryList.slice(1),
      ...(pathImage ? [pathImage] : []),
      ...versions,
    ]);
    const gallery = mergeGallery(main ?? fallback, extras, fallback);
    return { mainImage: main ?? fallback, gallery, fallback };
  }

  const legacy = row as LegacyRow;
  const primaryList = extractImages(legacy.main_image_url);
  const main = primaryList[0] ?? normalizeImageUrl(legacy.main_image_url) ?? fallback;
  const gallery = mergeGallery(main ?? fallback, primaryList.slice(1), fallback);
  return { mainImage: main ?? fallback, gallery, fallback };
}

export async function fetchProduct(slug: string): Promise<ProductData | null> {
  const admin = getAdminClient();
  let dataset: "shop" | "legacy" = "shop";
  let primary: PrimaryRow | null = null;

  try {
    const { data, error } = await admin
      .from("ecom_products")
      .select(
        "id, slug, title, short_desc, price, currency, images, image_path, status, category_slug, tags, specs, rating, sku"
      )
      .eq("slug", slug)
      .maybeSingle();
    if (!error && data) {
      const row = data as Record<string, unknown>;
      primary = {
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        title: String(row.title ?? "Untitled product"),
        short_desc: (row.short_desc as string) ?? null,
        description: (row.description as string) ?? null,
        price: Number(row.price ?? 0),
        currency: typeof row.currency === "string" ? String(row.currency) : null,
        images: row.images,
        image_path: typeof row.image_path === "string" ? row.image_path : null,
        status: (row.status as string) ?? null,
        category_slug: typeof row.category_slug === "string" ? row.category_slug : null,
        tags: Array.isArray(row.tags) ? (row.tags as string[]) : null,
        specs: row.specs,
        rating: typeof row.rating === "number" ? row.rating : Number(row.rating ?? 0),
        sku: typeof row.sku === "string" ? row.sku : null,
      };
    }
  } catch {
    // fallback later
  }

  if (!primary) {
    dataset = "legacy";
    try {
      const { data, error } = await admin
        .from("products")
        .select("id, slug, title, description, price_cents, currency, main_image_url, status")
        .eq("slug", slug)
        .maybeSingle();
      if (!error && data) {
        const legacy = data as Record<string, unknown>;
        const row: LegacyRow = {
          id: String(legacy.id ?? ""),
          slug: String(legacy.slug ?? ""),
          title: String(legacy.title ?? "Untitled product"),
          description: (legacy.description as string) ?? null,
          price_cents: typeof legacy.price_cents === "number"
            ? legacy.price_cents
            : Number((legacy.price_cents as number | string | null) ?? 0),
          currency: typeof legacy.currency === "string" ? String(legacy.currency) : null,
          main_image_url: typeof legacy.main_image_url === "string" ? legacy.main_image_url : null,
          status: (legacy.status as string) ?? "active",
        };

        const galleryInfo = await buildGallery(admin, dataset, row);
        const parsed = parseSpecsPayload(null);
        const currency = ensureCurrency(row.currency, dataset);
        const price = Number.isFinite(row.price_cents)
          ? Number(row.price_cents ?? 0) / 100
          : 0;
        const productUid = await resolveProductUid(admin, "public", "products", row.id);
        const reviewSummary = await loadReviewSummary(admin, productUid, null);

        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          shortDescription: row.description,
          description: row.description,
          price,
          currency,
          formattedPrice: formatCurrency(price, currency),
          gallery: galleryInfo.gallery,
          mainImage: galleryInfo.mainImage,
          fallbackImage: galleryInfo.fallback,
          dataset,
          status: ensureStatus(row.status),
          sku: null,
          category: { slug: null, name: null },
          tags: [],
          specs: parsed.specs,
          variants: parsed.variants,
          shippingEstimate: parsed.shippingEstimate,
          availabilityLabel: resolveAvailabilityLabel(row.status, parsed.shippingEstimate),
          reviewSummary,
          recentReviews: [],
          productUid,
          brand: parsed.brand,
        };
      }
    } catch {
      // ignore
    }
  }

  if (!primary) {
    return null;
  }

  const galleryInfo = await buildGallery(admin, dataset, primary);
  const parsed = parseSpecsPayload(primary.specs);
  const currency = ensureCurrency(primary.currency, dataset);
  const price = Number(primary.price ?? 0);
  const category = await resolveCategory(admin, primary.category_slug);
  const productUid = await resolveProductUid(admin, "public", "ecom_products", primary.id);
  const reviewSummary = await loadReviewSummary(admin, productUid, primary.rating ?? null);
  const recentReviews = await loadRecentReviews(admin, productUid, 2);

  return {
    id: primary.id,
    slug: primary.slug,
    title: primary.title,
    shortDescription: primary.short_desc,
    description: primary.description ?? primary.short_desc,
    price,
    currency,
    formattedPrice: formatCurrency(price, currency),
    gallery: galleryInfo.gallery,
    mainImage: galleryInfo.mainImage,
    fallbackImage: galleryInfo.fallback,
    dataset,
    status: ensureStatus(primary.status),
    sku: primary.sku ?? null,
    category,
    tags: toStringTags(primary.tags),
    specs: parsed.specs,
    variants: parsed.variants,
    shippingEstimate: parsed.shippingEstimate,
    availabilityLabel: resolveAvailabilityLabel(primary.status, parsed.shippingEstimate),
    reviewSummary,
    recentReviews,
    productUid,
    brand: parsed.brand,
  };
}

export async function fetchSimilarProducts(
  categorySlug: string | null,
  excludeId: string,
  limit = 8
): Promise<ProductGridItem[]> {
  if (!categorySlug) return [];
  const admin = getAdminClient();
  try {
    const { data, error } = await admin
      .from("ecom_products")
      .select("id, slug, title, short_desc, price, currency, images, image_path, status, rating")
      .eq("category_slug", categorySlug)
      .neq("id", excludeId)
      .in("status", ["active", "published"])
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row: any) => {
      const price = Number(row.price ?? 0);
      const currency = ensureCurrency(row.currency ?? null, "shop");
      const gallery = extractImages(row.images);
      const image = gallery[0] ?? normalizeImageUrl(row.image_path) ?? getFallbackImageByKey(row.id);
      const meta =
        typeof row.rating === "number" && Number.isFinite(row.rating)
          ? `★ ${row.rating.toFixed(1)}`
          : null;
      return {
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        title: String(row.title ?? ""),
        subtitle: row.short_desc ? String(row.short_desc) : undefined,
        price: formatCurrency(price, currency),
        meta,
        image,
      } satisfies ProductGridItem;
    });
  } catch {
    return [];
  }
}

export async function fetchProductsBySlugs(
  slugs: string[],
  limit = 12
): Promise<ProductGridItem[]> {
  const unique = Array.from(new Set(slugs.filter(Boolean))).slice(0, limit);
  if (!unique.length) return [];
  const admin = getAdminClient();
  try {
    const { data, error } = await admin
      .from("ecom_products")
      .select("id, slug, title, short_desc, price, currency, images, image_path, status, rating")
      .in("slug", unique)
      .in("status", ["active", "published"]);
    if (error || !data) return [];
    const bySlug = new Map<string, ProductGridItem>();
    for (const row of data as any[]) {
      const slug = String(row.slug ?? "");
      if (!slug) continue;
      const price = Number(row.price ?? 0);
      const currency = ensureCurrency(row.currency ?? null, "shop");
      const gallery = extractImages(row.images);
      const image = gallery[0] ?? normalizeImageUrl(row.image_path) ?? getFallbackImageByKey(row.id);
      const meta =
        typeof row.rating === "number" && Number.isFinite(row.rating)
          ? `★ ${row.rating.toFixed(1)}`
          : null;
      bySlug.set(slug, {
        id: String(row.id ?? ""),
        slug,
        title: String(row.title ?? ""),
        subtitle: row.short_desc ? String(row.short_desc) : undefined,
        price: formatCurrency(price, currency),
        meta,
        image,
      });
    }
    const ordered: ProductGridItem[] = [];
    for (const slug of unique) {
      const item = bySlug.get(slug);
      if (item) ordered.push(item);
    }
    return ordered;
  } catch {
    return [];
  }
}
