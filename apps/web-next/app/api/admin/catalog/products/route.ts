import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { createAuthenticatedClient } from "@/utils/supabase";
import {
  createEmptyProductTechSpecs,
  sanitizeProductTechSpecs,
} from "@/lib/catalog/product-tech-specs";
import type { ProductTechSpecs } from "@/lib/catalog/product-tech-specs";

const PRODUCT_FIELDS =
  "id, slug, title, description, price, currency, status, brand_id, created_at, specs";

const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
type CatalogProductStatus = (typeof PRODUCT_STATUSES)[number];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type ProductPayload = {
  id?: string;
  title?: string;
  slug?: string;
  brand_id?: string;
  description?: string | null;
  price?: number | string | null;
  currency?: string | null;
  status?: string | null;
  specs?: unknown;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function normalizeSlug(input: unknown, fallback?: string): string {
  const base = normalizeString(input) || normalizeString(fallback ?? "");
  if (!base) return "";
  const normalized = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return normalized || "";
}

function normalizeDescription(input: unknown): string | null {
  const value = normalizeString(input);
  return value || null;
}

function normalizePrice(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.round(input * 100) / 100;
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed * 100) / 100;
    }
  }
  return null;
}

function normalizeCurrency(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 8).toUpperCase();
}

function normalizeStatus(input: unknown, fallback: CatalogProductStatus = "draft"): CatalogProductStatus {
  if (typeof input === "string") {
    const value = input.trim().toLowerCase();
    if (PRODUCT_STATUSES.includes(value as CatalogProductStatus)) {
      return value as CatalogProductStatus;
    }
  }
  return fallback;
}

function parseStatusFilter(input: unknown): CatalogProductStatus | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (value === "all" || !value) return null;
  return PRODUCT_STATUSES.includes(value as CatalogProductStatus) ? (value as CatalogProductStatus) : null;
}

function buildSearchPattern(term: string): string {
  const escaped = term
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,");
  return `%${escaped}%`;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const brandFilter = normalizeString(url.searchParams.get("brand_id"));
  const queryFilter = normalizeString(url.searchParams.get("q"));
  const statusFilter = parseStatusFilter(url.searchParams.get("status"));
  const singleIdFilter = normalizeString(url.searchParams.get("id"));
  const idsParam = url.searchParams.get("ids");
  const includeSkuCount = url.searchParams.get("include_sku_count") === "1" || url.searchParams.get("include_sku_count") === "true";
  const hasSkuFilter = url.searchParams.get("has_sku") === "1" || url.searchParams.get("has_sku") === "true";
  const multiIdFilter = idsParam
    ? idsParam
        .split(",")
        .map((value) => normalizeString(value))
        .filter(Boolean)
    : [];

  const supabase = createAuthenticatedClient(auth.accessToken, "catalog-admin");
  let query = supabase
    .from("catalog_products")
    .select(PRODUCT_FIELDS)
    .order("created_at", { ascending: false, nullsFirst: true });

  if (singleIdFilter) {
    query = query.eq("id", singleIdFilter);
  } else if (multiIdFilter.length) {
    query = query.in("id", multiIdFilter);
  }

  if (brandFilter) {
    query = query.eq("brand_id", brandFilter);
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (queryFilter) {
    const pattern = buildSearchPattern(queryFilter);
    query = query.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) {
    return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  }

  let items = data ?? [];

  if ((includeSkuCount || hasSkuFilter) && items.length) {
    const ids = items.map((item) => item.id).filter(isNonEmptyString);
    const { data: skuRows, error: skuError } = await createAuthenticatedClient(auth.accessToken, "catalog-admin")
      .from("ecom_products")
      .select("catalog_product_id")
      .in("catalog_product_id", ids);
    if (!skuError && Array.isArray(skuRows)) {
      const counts = new Map<string, number>();
      for (const row of skuRows) {
        const pid = typeof row?.catalog_product_id === "string" ? row.catalog_product_id : null;
        if (!pid) continue;
        counts.set(pid, (counts.get(pid) ?? 0) + 1);
      }
      items = items
        .map((item) => {
          const productId = typeof item.id === "string" ? item.id : null;
          const skuCount = productId ? counts.get(productId) ?? 0 : 0;
          return {
            ...item,
            sku_count: skuCount,
          };
        })
        .filter((item) => (hasSkuFilter ? (item as any).sku_count > 0 : true));
    }
  }

  return json({ ok: true, items }, 200);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: ProductPayload;
  try {
    payload = (await request.json()) as ProductPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const title = normalizeString(payload.title);
  if (!title) {
    return json({ ok: false, error: "title_required" }, 400);
  }

  const brandId = normalizeString(payload.brand_id);
  if (!brandId) {
    return json({ ok: false, error: "brand_required" }, 400);
  }

  const slug = normalizeSlug(payload.slug, title);
  if (!slug) {
    return json({ ok: false, error: "slug_required" }, 400);
  }

  const status = normalizeStatus(payload.status, "draft");
  const description = normalizeDescription(payload.description);
  const price = normalizePrice(payload.price);
  if (price == null || price < 0) {
    return json({ ok: false, error: "price_required" }, 400);
  }
  const currency = normalizeCurrency(payload.currency);
  if (!currency) {
    return json({ ok: false, error: "currency_required" }, 400);
  }
  const id = normalizeString(payload.id) || undefined;
  const specsInput = (payload.specs ?? null) as ProductTechSpecs | null;
  const specs = sanitizeProductTechSpecs(specsInput) ?? createEmptyProductTechSpecs();

  const supabase = createAuthenticatedClient(auth.accessToken, "catalog-admin");
  const record = {
    title,
    slug,
    brand_id: brandId,
    status,
    description,
    price,
    currency,
    specs,
  };

  const query = id
    ? supabase.from("catalog_products").update(record).eq("id", id).select(PRODUCT_FIELDS).maybeSingle()
    : supabase.from("catalog_products").insert(record).select(PRODUCT_FIELDS).maybeSingle();

  const { data, error } = await query;
  if (error) {
    const statusCode = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "duplicate_slug" : "save_failed";
    return json({ ok: false, error: message, message: error.message }, statusCode);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: ProductPayload;
  try {
    payload = (await request.json()) as ProductPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  if (!id) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const supabase = createAuthenticatedClient(auth.accessToken, "catalog-admin");

  // prevent archiving when SKUs are linked
  const { count: skuCount, error: skuCheckError } = await supabase
    .from("ecom_products")
    .select("id", { count: "exact", head: true })
    .eq("catalog_product_id", id);
  if (!skuCheckError && typeof skuCount === "number" && skuCount > 0) {
    return json(
      { ok: false, error: "has_sku", message: "К модели привязаны SKU. Сначала отвяжите их." },
      409,
    );
  }

  const { data, error } = await supabase
    .from("catalog_products")
    .update({ status: "archived" })
    .eq("id", id)
    .select(PRODUCT_FIELDS)
    .maybeSingle();

  if (error) {
    return json({ ok: false, error: "delete_failed", message: error.message }, 500);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}
