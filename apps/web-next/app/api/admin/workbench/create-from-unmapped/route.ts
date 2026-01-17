import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { normalizeSku, slugifyTitle } from "@shared/lib/normalize";

const MAPPING_FIELDS =
  "id, supplier_id, sku_id, supplier_sku, cost_cents, currency, lead_time_days, last_synced_at, last_seen_at, miss_count, created_at, updated_at";
const ECOM_JOIN_FIELDS = "id, sku, slug, title, currency, price_cents, is_available, inventory_status, stock_quantity";

const UNMAPPED_TABLE = "supplier_feed_unmapped" as any;

type CreatePayload = {
  supplier_id?: string;
  vendor_sku?: string;
  currency?: string | null;
  cost_cents?: number | string | null;
  lead_time_days?: number | string | null;
  title?: string | null;
  allow_suffix?: boolean;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function normalizeOptionalString(input: unknown): string | null {
  const value = normalizeString(input);
  return value || null;
}

function normalizeCurrency(input: unknown, fallback?: string): string {
  const value = normalizeString(input).toUpperCase();
  if (value) return value;
  return fallback && fallback.trim() ? fallback.trim().toUpperCase() : "USD";
}

function normalizeNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return Math.round(input);
  if (typeof input === "string" && input.trim()) {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

function parseDecimal(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string" && input.trim()) {
    const parsed = Number(input.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function resolveSupplierCurrency(supplierId: string): Promise<string> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("suppliers").select("default_currency").eq("id", supplierId).maybeSingle();
  const currency = normalizeString((data as { default_currency?: string | null } | null)?.default_currency ?? "");
  return currency ? currency.toUpperCase() : "USD";
}

function pickTitleFromPayload(payload: Record<string, unknown> | null, vendorSku: string) {
  const candidates = [
    payload?.title,
    payload?.name,
    payload?.product_title,
    payload?.product_name,
    payload?.model,
    payload?.item,
    payload?.sku,
    payload?.vendor_sku,
    payload?.supplier_sku,
  ];
  for (const value of candidates) {
    const text = normalizeString(value);
    if (text) return text;
  }
  return vendorSku ? `Vendor SKU ${vendorSku}` : "Draft SKU";
}

function derivePriceFromPayload(payload: Record<string, unknown> | null) {
  const priceCentsRaw = parseDecimal(payload?.price_cents ?? payload?.priceCents ?? null);
  const priceRaw = parseDecimal(payload?.price ?? null);
  const priceCents =
    priceCentsRaw != null
      ? Math.round(priceCentsRaw)
      : priceRaw != null
        ? Math.round(priceRaw * 100)
        : 0;
  return {
    price_cents: priceCents,
    price: priceCents / 100,
  };
}

async function findExistingSkuConflict(params: { supabase: ReturnType<typeof getAdminClient>; slug: string; sku: string }) {
  const { supabase, slug, sku } = params;
  const { data } = await supabase
    .from("ecom_products")
    .select("id, slug, sku")
    .or(`slug.eq.${slug},sku.eq.${sku}`)
    .limit(5);
  const rows = Array.isArray(data) ? data : [];
  const skuMatch = rows.find((row) => normalizeString((row as any).sku) === sku);
  const slugMatch = rows.find((row) => normalizeString((row as any).slug) === slug);
  return {
    existing: skuMatch ?? slugMatch ?? null,
    skuConflict: Boolean(skuMatch),
    slugConflict: Boolean(slugMatch),
  };
}

async function resolveUniqueSkuAndSlug(params: {
  supabase: ReturnType<typeof getAdminClient>;
  baseSlug: string;
  baseSku: string;
  allowSuffix?: boolean;
}) {
  const { supabase, baseSlug, baseSku, allowSuffix } = params;
  const conflict = await findExistingSkuConflict({ supabase, slug: baseSlug, sku: baseSku });
  if (!conflict.existing) {
    return { slug: baseSlug, sku: baseSku, conflict: null, suggested: null };
  }

  const suggestedSlug = `${baseSlug}-2`;
  const suggestedSku = normalizeSku(`${baseSku}-2`, baseSku);
  if (!allowSuffix) {
    return { slug: baseSlug, sku: baseSku, conflict, suggested: { slug: suggestedSlug, sku: suggestedSku } };
  }

  for (let i = 2; i <= 6; i += 1) {
    const nextSlug = `${baseSlug}-${i}`;
    const nextSku = normalizeSku(`${baseSku}-${i}`, baseSku);
    const nextConflict = await findExistingSkuConflict({ supabase, slug: nextSlug, sku: nextSku });
    if (!nextConflict.existing) {
      return { slug: nextSlug, sku: nextSku, conflict: null, suggested: null };
    }
  }

  const suffix = Math.random().toString(36).slice(2, 6);
  const fallbackSlug = `${baseSlug}-${suffix}`;
  const fallbackSku = normalizeSku(`${baseSku}-${suffix}`, baseSku);
  return { slug: fallbackSlug, sku: fallbackSku, conflict: null, suggested: null };
}

async function findVendorSkuMapping(params: {
  supabase: ReturnType<typeof getAdminClient>;
  supplierId: string;
  vendorSku: string;
}) {
  const { supabase, supplierId, vendorSku } = params;
  const { data } = await supabase
    .from("supplier_skus")
    .select("id, sku_id, supplier_sku")
    .eq("supplier_id", supplierId)
    .eq("supplier_sku", vendorSku)
    .maybeSingle();
  return data as { id: string; sku_id: string; supplier_sku: string } | null;
}

async function deleteUnmappedRow(params: { supabase: ReturnType<typeof getAdminClient>; supplierId: string; vendorSku: string }) {
  const { supabase, supplierId, vendorSku } = params;
  await supabase.from(UNMAPPED_TABLE).delete().eq("supplier_id", supplierId).eq("vendor_sku", vendorSku);
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

  const supplierId = normalizeString(payload.supplier_id);
  const vendorSku = normalizeOptionalString(payload.vendor_sku);

  if (!supplierId || !vendorSku) {
    return json({ ok: false, error: "mapping_required" }, 400);
  }

  const supabase = getAdminClient();

  const existingMapping = await findVendorSkuMapping({ supabase, supplierId, vendorSku });
  if (existingMapping?.sku_id) {
    return json(
      {
        ok: false,
        error: "vendor_sku_already_mapped",
        message: "Vendor SKU already mapped for this supplier.",
        sku_id: existingMapping.sku_id,
        mapping_id: existingMapping.id,
      },
      409,
    );
  }

  const { data: unmappedRow } = await supabase
    .from(UNMAPPED_TABLE)
    .select("id, vendor_sku, sample_payload, last_seen_at")
    .eq("supplier_id", supplierId)
    .eq("vendor_sku", vendorSku)
    .maybeSingle();

  if (!unmappedRow) {
    return json({ ok: false, error: "unmapped_not_found" }, 404);
  }

  const samplePayload = (unmappedRow as any)?.sample_payload as Record<string, unknown> | null;
  const title = normalizeString(payload.title) || pickTitleFromPayload(samplePayload, vendorSku);
  const baseSlug = slugifyTitle(title, vendorSku);
  const baseSku = normalizeSku(vendorSku || baseSlug, title);

  const { slug, sku, conflict, suggested } = await resolveUniqueSkuAndSlug({
    supabase,
    baseSlug,
    baseSku,
    allowSuffix: Boolean(payload.allow_suffix),
  });

  if (conflict) {
    const existingId = (conflict.existing as any)?.id ?? null;
    return json(
      {
        ok: false,
        error: "sku_slug_conflict",
        message: "SKU or slug already exists.",
        existing_id: existingId,
        suggested_slug: suggested?.slug ?? null,
        suggested_sku: suggested?.sku ?? null,
      },
      409,
    );
  }

  const defaultCurrency = await resolveSupplierCurrency(supplierId);
  const currency = normalizeCurrency(payload.currency ?? samplePayload?.currency ?? null, defaultCurrency);
  const priceValues = derivePriceFromPayload(samplePayload);

  const record = {
    title,
    slug,
    sku,
    price: priceValues.price,
    price_cents: priceValues.price_cents,
    currency,
    status: "draft",
    category_slug: null,
    catalog_product_id: null,
    short_desc: null,
  };

  const { data: skuRow, error: skuError } = await supabase
    .from("ecom_products")
    .insert(record)
    .select("id, slug, sku, title, currency")
    .maybeSingle();

  if (skuError) {
    const status = skuError.code === "23505" ? 409 : 500;
    const code = skuError.code === "23505" ? "sku_slug_conflict" : "sku_create_failed";
    return json({ ok: false, error: code, message: skuError.message }, status);
  }

  if (!skuRow) {
    return json({ ok: false, error: "sku_create_failed" }, 500);
  }

  const currencyValue = normalizeCurrency(payload.currency ?? samplePayload?.currency ?? null, defaultCurrency);
  const mappingRecord = {
    supplier_id: supplierId,
    sku_id: (skuRow as any).id,
    supplier_sku: vendorSku,
    cost_cents: normalizeNumber(payload.cost_cents ?? samplePayload?.cost_cents ?? samplePayload?.cost ?? null),
    currency: currencyValue,
    lead_time_days: normalizeNumber(payload.lead_time_days ?? samplePayload?.lead_time_days ?? null),
  };

  const { data: mappingRow, error: mappingError } = await supabase
    .from("supplier_skus")
    .insert(mappingRecord)
    .select(`${MAPPING_FIELDS}, ecom_products(${ECOM_JOIN_FIELDS})`)
    .maybeSingle();

  if (mappingError) {
    await supabase.from("ecom_products").delete().eq("id", (skuRow as any).id);
    const status = mappingError.code === "23505" ? 409 : 500;
    const code = mappingError.code === "23505" ? "vendor_sku_already_mapped" : "mapping_failed";
    return json({ ok: false, error: code, message: mappingError.message }, status);
  }

  await deleteUnmappedRow({ supabase, supplierId, vendorSku });

  return json(
    {
      ok: true,
      sku: skuRow,
      item: mappingRow,
    },
    200,
  );
}
