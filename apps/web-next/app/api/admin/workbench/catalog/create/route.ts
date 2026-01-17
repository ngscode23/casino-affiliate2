import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

type CreatePayload = {
  sku_id?: string;
  title?: string;
  slug?: string;
  brand_id?: string;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function normalizeSlug(input: string): string {
  const base = normalizeString(input);
  if (!base) return "";
  return base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normalizePrice(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.round(input * 100) / 100;
  }
  if (typeof input === "string") {
    const parsed = Number(input.replace(",", "."));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
  }
  return null;
}

function normalizeCurrency(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toUpperCase();
  if (!value) return null;
  return value.slice(0, 3);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: CreatePayload;
  try {
    payload = (await request.json()) as CreatePayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const skuId = normalizeString(payload.sku_id);
  if (!skuId) {
    return json({ ok: false, error: "sku_id_required" }, 400);
  }

  const supabase = getAdminClient();
  const catalogClient = getAdminClient("catalog");

  const { data: skuRow, error: skuError } = await supabase
    .from("ecom_products")
    .select("id, title, slug, price, price_cents, currency")
    .eq("id", skuId)
    .maybeSingle();
  if (skuError) {
    return json({ ok: false, error: "sku_fetch_failed", message: skuError.message }, 500);
  }
  if (!skuRow) {
    return json({ ok: false, error: "sku_not_found" }, 404);
  }

  const title = normalizeString(payload.title) || normalizeString((skuRow as any).title);
  if (!title) {
    return json({ ok: false, error: "title_required" }, 400);
  }

  const slugInput = normalizeString(payload.slug) || normalizeString((skuRow as any).slug) || title;
  const slug = normalizeSlug(slugInput);
  if (!slug) {
    return json({ ok: false, error: "slug_required" }, 400);
  }

  let priceValue = normalizePrice((skuRow as any).price);
  if (priceValue == null && typeof (skuRow as any).price_cents === "number") {
    priceValue = Math.round((skuRow as any).price_cents) / 100;
  }
  if (priceValue == null || priceValue < 0) {
    return json({ ok: false, error: "price_required" }, 400);
  }

  let currency = normalizeCurrency((skuRow as any).currency);
  if (!currency) {
    currency =
      normalizeCurrency(process.env.DEFAULT_CURRENCY) ||
      normalizeCurrency(process.env.NEXT_PUBLIC_DEFAULT_CURRENCY) ||
      "USD";
  }

  const brandId = normalizeString(payload.brand_id) || null;

  const { data: existing, error: existingError } = await catalogClient
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingError) {
    return json({ ok: false, error: "catalog_fetch_failed", message: existingError.message }, 500);
  }
  if (existing) {
    return json({ ok: false, error: "duplicate_slug", catalog_id: existing.id }, 409);
  }

  const record = {
    title,
    slug,
    price: priceValue,
    currency,
    status: "draft",
    brand_id: brandId || null,
  };

  const { data: created, error: createError } = await catalogClient
    .from("products")
    .insert(record)
    .select("id, slug, title, status, brand_id")
    .maybeSingle();

  if (createError) {
    return json({ ok: false, error: "create_failed", message: createError.message }, 500);
  }
  if (!created) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  const { error: updateError } = await supabase
    .from("ecom_products")
    .update({ catalog_product_id: created.id })
    .eq("id", skuId);
  if (updateError) {
    return json({ ok: false, error: "link_failed", message: updateError.message }, 500);
  }

  return json(
    {
      ok: true,
      catalog: {
        id: created.id,
        slug: created.slug,
        title: created.title,
        status: created.status,
        brand_id: created.brand_id ?? null,
      },
      catalog_product_id: created.id,
    },
    200,
  );
}
