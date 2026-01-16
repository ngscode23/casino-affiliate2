import { json, qsNumber } from "@/app/api/orders/utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import { normalizeSku, slugifyTitle } from "@shared/lib/normalize";

const PRODUCT_FIELDS =
  "id, sku, slug, title, price, price_cents, currency, status, category_slug, short_desc, images, tags, rating, specs, created_at, catalog_product_id, is_available, inventory_status, stock_quantity";

const STATUS_VALUES = new Set(["draft", "published", "archived", "active"]);
const SORT_WHITELIST = new Set(["rating", "price", "title", "created_at"]);
const DEFAULT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || "product-images";
const DEFAULT_CURRENCY =
  process.env.DEFAULT_CURRENCY || process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "EUR";

type ProductPayload = {
  id?: string;
  title?: string;
  slug?: string;
  sku?: string;
  price?: number | string | null;
  price_cents?: number | string | null;
  currency?: string | null;
  status?: string | null;
  category_slug?: string | null;
  short_desc?: string | null;
  images?: unknown;
  tags?: unknown;
  rating?: number | string | null;
  specs?: unknown;
  catalog_product_id?: string | null;
};

type AdminOpPayload = {
  op?: string;
  product?: ProductPayload;
  ids?: string[];
};

function normalizeString(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeSlug(input: unknown, fallback?: string): string {
  const raw = normalizeString(input) || normalizeString(fallback ?? "");
  if (!raw) return "";
  return slugifyTitle(raw);
}

function normalizeStatus(input: unknown, fallback = "draft"): string {
  const value = normalizeString(input).toLowerCase();
  return STATUS_VALUES.has(value) ? value : fallback;
}

function resolveStatusFilter(input: unknown): string[] | null {
  const value = normalizeString(input).toLowerCase();
  if (!value || value === "all") return null;
  if (value === "published") return ["published", "active"];
  return STATUS_VALUES.has(value) ? [value] : null;
}

function normalizeCurrency(input: unknown): string | null {
  const value = normalizeString(input).toUpperCase();
  if (!value) return null;
  return /^[A-Z]{3}$/.test(value) ? value : null;
}

function normalizePrice(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.round(input * 100) / 100;
  }
  if (typeof input === "string") {
    const parsed = Number(input.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return Math.round(parsed * 100) / 100;
    }
  }
  return null;
}

function normalizeTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((value) => normalizeString(value)).filter(Boolean);
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => normalizeString(value)).filter(Boolean);
      }
    } catch {
      // fallthrough to CSV parsing
    }
    return input
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeImages(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((value) => normalizeString(value)).filter(Boolean);
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => normalizeString(value)).filter(Boolean);
      }
    } catch {
      // ignore invalid json
    }
  }
  return [];
}

function normalizeSpecs(input: unknown): Record<string, unknown> {
  if (!input) return {};
  if (typeof input === "object") return input as Record<string, unknown>;
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      // ignore malformed json
    }
  }
  return {};
}

function normalizeRating(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const parsed = Number(input.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickSupabaseUrl(): string {
  const candidates = [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

function normalizePath(raw: string, bucket: string): string {
  const trimmed = raw.replace(/^\/+/, "");
  const bucketPrefix = `${bucket}/`;
  if (trimmed.startsWith(bucketPrefix)) {
    return trimmed.slice(bucketPrefix.length);
  }
  return trimmed;
}

function toPublicUrl(baseUrl: string, bucket: string, path: unknown): string | null {
  if (typeof path !== "string" || !path.trim()) return null;
  if (/^https?:/i.test(path)) return path.trim();
  if (!baseUrl) return null;
  const objectPath = normalizePath(path.trim(), bucket)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
}

function mapRow(row: Record<string, unknown>, supabaseUrl: string, bucket: string) {
  const priceValue = typeof row.price === "number" ? row.price : Number(row.price ?? 0);
  const price = Number.isFinite(priceValue) ? priceValue : 0;
  const priceCents =
    typeof row.price_cents === "number" && Number.isFinite(row.price_cents)
      ? Math.round(row.price_cents)
      : Math.round(price * 100);
  const imagesRaw = Array.isArray(row.images) ? row.images : [];
  const images = (imagesRaw as unknown[])
    .map((value) => (typeof value === "string" ? toPublicUrl(supabaseUrl, bucket, value) ?? value : null))
    .filter(Boolean) as string[];

  return {
    ...row,
    price,
    price_cents: priceCents,
    images,
  };
}

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildDuplicateSku(source: Record<string, unknown>) {
  const baseTitle = normalizeString(source.title) || normalizeString(source.slug) || "Product";
  const baseSlug = normalizeString(source.slug) || slugifyTitle(baseTitle);
  const baseSku = normalizeString(source.sku) || baseSlug.toUpperCase();
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toLowerCase();

  return {
    title: `${baseTitle} (Copy)`,
    slug: slugifyTitle(`${baseSlug}-copy-${suffix}`),
    sku: normalizeSku(`${baseSku}-COPY-${suffix}`),
    price: source.price ?? null,
    price_cents: source.price_cents ?? null,
    currency: source.currency ?? null,
    status: "draft",
    category_slug: source.category_slug ?? null,
    short_desc: source.short_desc ?? null,
    images: Array.isArray(source.images) ? source.images : [],
    tags: Array.isArray(source.tags) ? source.tags : [],
    rating: source.rating ?? null,
    specs: source.specs ?? {},
    catalog_product_id: source.catalog_product_id ?? null,
  };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const q = sanitizeSearchParam(url.searchParams.get("q"));
  const category = sanitizeSearchParam(url.searchParams.get("category"));
  const catalogProductId = sanitizeSearchParam(url.searchParams.get("catalog_product_id"));
  const statusFilter = resolveStatusFilter(url.searchParams.get("status"));
  const sortRaw = sanitizeSearchParam(url.searchParams.get("sort"));
  const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
  const limit = qsNumber(url.searchParams.get("limit"), 25, { min: 1, max: 500, round: true });
  const page = qsNumber(url.searchParams.get("page"), 1, { min: 1, max: 1000, round: true });

  const ids = parseIds(url.searchParams.get("ids"));
  const singleId = normalizeString(url.searchParams.get("id"));
  if (singleId) ids.unshift(singleId);

  try {
    const supabase = getAdminClient();
    let query = supabase.from("ecom_products").select(PRODUCT_FIELDS, { count: "exact" });

    if (ids.length) {
      query = query.in("id", Array.from(new Set(ids)));
    }
    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
      query = query.or(`sku.ilike.${pattern},slug.ilike.${pattern},title.ilike.${pattern}`);
    }
    if (category) {
      query = query.eq("category_slug", category);
    }
    if (catalogProductId) {
      query = query.eq("catalog_product_id", catalogProductId);
    }
    if (statusFilter && statusFilter.length > 0) {
      if (statusFilter.length === 1) query = query.eq("status", statusFilter[0]);
      else query = query.in("status", statusFilter);
    }

    const sortColumn = SORT_WHITELIST.has(sortRaw) ? sortRaw : "created_at";
    query = query.order(sortColumn, { ascending: dir === "asc", nullsFirst: false });

    const start = Math.max(0, (page - 1) * limit);
    const end = start + limit - 1;
    const { data, error, count } = await query.range(start, end);

    if (error) {
      return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
    }

    const supabaseUrl = pickSupabaseUrl();
    const bucket = DEFAULT_BUCKET;
    const items = Array.isArray(data)
      ? data.map((row) => mapRow(row as Record<string, unknown>, supabaseUrl, bucket))
      : [];

    return json({ ok: true, items, total: typeof count === "number" ? count : items.length, page, limit }, 200);
  } catch (error: any) {
    return json({ ok: false, error: "internal", message: error?.message ?? "internal" }, 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: AdminOpPayload;
  try {
    payload = (await request.json()) as AdminOpPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const op = normalizeString(payload.op || "upsert").toLowerCase();
  const supabase = getAdminClient();

  if (op === "delete" || op === "archive") {
    const ids = Array.isArray(payload.ids)
      ? payload.ids.map((value) => normalizeString(value)).filter(Boolean)
      : [];
    if (!ids.length) {
      return json({ ok: false, error: "ids_required" }, 400);
    }
    const { data, error } = await supabase
      .from("ecom_products")
      .update({ status: "archived", deleted_at: new Date().toISOString() })
      .in("id", ids)
      .select("id");
    if (error) {
      return json({ ok: false, error: "delete_failed", message: error.message }, 500);
    }
    return json({ ok: true, archived: Array.isArray(data) ? data.length : 0 }, 200);
  }

  if (op === "duplicate") {
    const ids = Array.isArray(payload.ids)
      ? payload.ids.map((value) => normalizeString(value)).filter(Boolean)
      : [];
    if (!ids.length) {
      return json({ ok: false, error: "ids_required" }, 400);
    }
    const { data, error } = await supabase.from("ecom_products").select(PRODUCT_FIELDS).in("id", ids);
    if (error) {
      return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
    }
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      return json({ ok: true, duplicated: 0, items: [] }, 200);
    }
    const duplicates = rows.map((row) => buildDuplicateSku(row as Record<string, unknown>));
    const { data: inserted, error: insertError } = await supabase
      .from("ecom_products")
      .insert(duplicates)
      .select(PRODUCT_FIELDS);
    if (insertError) {
      return json({ ok: false, error: "duplicate_failed", message: insertError.message }, 500);
    }
    return json({
      ok: true,
      duplicated: Array.isArray(inserted) ? inserted.length : 0,
      items: inserted ?? [],
    }, 200);
  }

  if (op !== "upsert") {
    return json({ ok: false, error: "unsupported_op" }, 400);
  }

  const product = payload.product ?? {};
  const id = normalizeString(product.id);
  const title = normalizeString(product.title);
  if (!title) {
    return json({ ok: false, error: "title_required" }, 400);
  }
  const sku = normalizeSku(product.sku, title);
  const slug = normalizeSlug(product.slug, title);
  if (!slug) {
    return json({ ok: false, error: "slug_required" }, 400);
  }

  let priceValue = normalizePrice(product.price);
  if (priceValue == null && typeof product.price_cents === "number" && Number.isFinite(product.price_cents)) {
    priceValue = Math.round(product.price_cents) / 100;
  }
  if (priceValue == null || priceValue < 0) {
    return json({ ok: false, error: "price_required" }, 400);
  }
  let currency = normalizeCurrency(product.currency);
  if (!currency && id) {
    const { data: existing, error: existingError } = await supabase
      .from("ecom_products")
      .select("currency")
      .eq("id", id)
      .maybeSingle();
    if (!existingError && existing?.currency) {
      currency = normalizeCurrency(existing.currency);
    }
  }
  if (!currency) {
    currency = normalizeCurrency(DEFAULT_CURRENCY);
  }
  if (!currency) {
    return json({ ok: false, error: "currency_required" }, 400);
  }
  const categorySlug = normalizeString(product.category_slug);
  if (!categorySlug) {
    return json({ ok: false, error: "category_required" }, 400);
  }
  const catalogProductId = normalizeString(product.catalog_product_id);
  if (!catalogProductId) {
    return json({ ok: false, error: "catalog_product_required" }, 400);
  }

  const status = normalizeStatus(product.status, "draft");
  const rating = normalizeRating(product.rating);
  const tags = normalizeTags(product.tags);
  const images = normalizeImages(product.images);
  const specs = normalizeSpecs(product.specs);

  const priceCents = Math.round(priceValue * 100);

  const record = {
    title,
    slug,
    sku,
    price: priceValue,
    price_cents: priceCents,
    currency,
    status,
    category_slug: categorySlug,
    short_desc: normalizeString(product.short_desc) || null,
    tags,
    images,
    rating,
    specs,
    catalog_product_id: catalogProductId,
  };

  const query = id
    ? supabase.from("ecom_products").update(record).eq("id", id).select(PRODUCT_FIELDS).maybeSingle()
    : supabase.from("ecom_products").insert(record).select(PRODUCT_FIELDS).maybeSingle();

  const { data, error } = await query;
  if (error) {
    const statusCode = error.code === "23505" ? 409 : 500;
    return json({ ok: false, error: "save_failed", message: error.message }, statusCode);
  }
  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  try {
    const saved = data as Record<string, unknown>;
    const savedImages = Array.isArray(saved.images) ? saved.images : [];
    const firstImage = savedImages.find((value) => typeof value === "string" && value.trim());
    if (firstImage) {
      await supabase
        .from("catalog_products")
        .update({ thumbnail_url: String(firstImage) })
        .eq("id", catalogProductId)
        .or("thumbnail_url.is.null,thumbnail_url.eq.");
    }
  } catch (syncError) {
    console.warn("[admin-shop-products] catalog thumbnail sync failed", syncError);
  }

  try {
    revalidateTag("products:list", {});
    if (slug) revalidateTag(`product:${slug}`, {});
    if (categorySlug) revalidateTag(`category:${categorySlug}`, {});
    try {
      revalidatePath("/");
      if (slug) revalidatePath(`/products/${slug}`);
    } catch (pathError) {
      console.warn("[admin-shop-products] revalidatePath failed", pathError);
    }
  } catch (revalidateError) {
    console.warn("[admin-shop-products] revalidate failed", revalidateError);
  }

  return json({ ok: true, id: (data as any).id ?? id, item: data }, 200);
}
