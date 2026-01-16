import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const MAPPING_FIELDS =
  "id, supplier_id, sku_id, supplier_sku, cost_cents, currency, lead_time_days, last_synced_at, last_seen_at, miss_count, created_at, updated_at";
const ECOM_JOIN_FIELDS = "id, sku, slug, title, currency, price_cents, is_available, inventory_status, stock_quantity";

const DEFAULT_LIMIT = 200;

type SupplierSkuPayload = {
  id?: string;
  supplier_id?: string;
  sku_id?: string;
  supplier_sku?: string;
  cost_cents?: number | string | null;
  currency?: string | null;
  lead_time_days?: number | string | null;
  op?: string;
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

async function findVendorSkuConflict(params: {
  supabase: ReturnType<typeof getAdminClient>;
  supplierId: string;
  supplierSku: string;
}) {
  const { supabase, supplierId, supplierSku } = params;
  const { data } = await supabase
    .from("supplier_skus")
    .select("id, sku_id, supplier_sku")
    .eq("supplier_id", supplierId)
    .eq("supplier_sku", supplierSku)
    .maybeSingle();
  return data as { id: string; sku_id: string; supplier_sku: string } | null;
}


function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function resolveSupplierCurrency(supplierId: string): Promise<string> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("suppliers").select("default_currency").eq("id", supplierId).maybeSingle();
  const currency = normalizeString((data as { default_currency?: string | null } | null)?.default_currency ?? "");
  return currency ? currency.toUpperCase() : "USD";
}

async function bulkMatchBySku(supplierId: string) {
  const supabase = getAdminClient();
  const defaultCurrency = await resolveSupplierCurrency(supplierId);

  const { data: products, error } = await supabase
    .from("ecom_products")
    .select("id, sku, currency, is_available, inventory_status, stock_quantity")
    .not("sku", "is", null)
    .limit(5000);

  if (error) {
    return { error: error.message, status: 500 };
  }

  const rows = Array.isArray(products)
    ? products
        .map((row) => ({
          supplier_id: supplierId,
          sku_id: String((row as any).id),
          supplier_sku: normalizeString((row as any).sku),
          currency: normalizeCurrency((row as any).currency, defaultCurrency),
        }))
        .filter((row) => row.supplier_sku && row.sku_id)
    : [];

  if (!rows.length) {
    return { data: { upserted: 0, received: 0 } };
  }

  let upserted = 0;
  for (const chunk of chunkArray(rows, 500)) {
    const { data, error: upsertError } = await supabase
      .from("supplier_skus")
      .upsert(chunk, { onConflict: "supplier_id,sku_id" })
      .select("id");
    if (upsertError) {
      return { error: upsertError.message, status: 500 };
    }
    upserted += Array.isArray(data) ? data.length : 0;
  }

  return { data: { upserted, received: rows.length } };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const supplierId = normalizeString(url.searchParams.get("supplier_id"));
  const q = normalizeString(url.searchParams.get("q"));
  const limit = Math.min(Number(url.searchParams.get("limit") || DEFAULT_LIMIT), 1000);

  const supabase = getAdminClient();

  let skuIds: string[] = [];
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    const { data } = await supabase
      .from("ecom_products")
      .select("id")
      .or(`sku.ilike.${pattern},slug.ilike.${pattern},title.ilike.${pattern}`)
      .limit(200);
    skuIds = Array.isArray(data) ? data.map((row) => String((row as any).id)) : [];
  }

  let query = supabase
    .from("supplier_skus")
    .select(`${MAPPING_FIELDS}, ecom_products(${ECOM_JOIN_FIELDS})`)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }

  if (q) {
    if (skuIds.length) {
      query = query.in("sku_id", skuIds);
    } else {
      const pattern = `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
      query = query.ilike("supplier_sku", pattern);
    }
  }

  const { data, error } = await query;
  if (error) {
    return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  }

  return json({ ok: true, items: data ?? [] }, 200);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: SupplierSkuPayload;
  try {
    payload = (await request.json()) as SupplierSkuPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  if (payload.op === "bulk_match") {
    const supplierId = normalizeString(payload.supplier_id);
    if (!supplierId) return json({ ok: false, error: "supplier_required" }, 400);
    const result = await bulkMatchBySku(supplierId);
    if ("error" in result && result.error) {
      return json({ ok: false, error: "bulk_failed", message: result.error }, result.status ?? 500);
    }
    return json({ ok: true, stats: result.data ?? {} }, 200);
  }

  const supplierId = normalizeString(payload.supplier_id);
  const skuId = normalizeString(payload.sku_id);
  if (!supplierId || !skuId) {
    return json({ ok: false, error: "supplier_sku_required" }, 400);
  }

  const supplierSku = normalizeOptionalString(payload.supplier_sku);
  if (!supplierSku) {
    return json({ ok: false, error: "supplier_sku_required" }, 400);
  }

  const supabase = getAdminClient();
  const conflict = await findVendorSkuConflict({ supabase, supplierId, supplierSku });
  if (conflict?.sku_id && conflict.sku_id !== skuId) {
    return json(
      {
        ok: false,
        error: "vendor_sku_already_mapped",
        message: "Vendor SKU already mapped for this supplier.",
        sku_id: conflict.sku_id,
        mapping_id: conflict.id,
      },
      409,
    );
  }

  const currency = normalizeCurrency(payload.currency, await resolveSupplierCurrency(supplierId));
  const record = {
    supplier_id: supplierId,
    sku_id: skuId,
    supplier_sku: supplierSku,
    cost_cents: normalizeNumber(payload.cost_cents),
    currency,
    lead_time_days: normalizeNumber(payload.lead_time_days),
  };

  const { data, error } = await supabase
    .from("supplier_skus")
    .upsert(record, { onConflict: "supplier_id,sku_id" })
    .select(`${MAPPING_FIELDS}, ecom_products(${ECOM_JOIN_FIELDS})`)
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const code = error.code === "23505" ? "vendor_sku_already_mapped" : "save_failed";
    return json({ ok: false, error: code, message: error.message }, status);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: SupplierSkuPayload;
  try {
    payload = (await request.json()) as SupplierSkuPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  const supplierId = normalizeString(payload.supplier_id);
  const skuId = normalizeString(payload.sku_id);

  if (!id && (!supplierId || !skuId)) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const updates: Record<string, unknown> = {};

  if ("supplier_sku" in payload) {
    const supplierSku = normalizeOptionalString(payload.supplier_sku);
    if (!supplierSku) return json({ ok: false, error: "supplier_sku_required" }, 400);
    updates.supplier_sku = supplierSku;
  }

  if ("cost_cents" in payload) {
    updates.cost_cents = normalizeNumber(payload.cost_cents);
  }

  if ("currency" in payload) {
    updates.currency = normalizeCurrency(payload.currency, undefined);
  }

  if ("lead_time_days" in payload) {
    updates.lead_time_days = normalizeNumber(payload.lead_time_days);
  }

  if (!Object.keys(updates).length) {
    return json({ ok: false, error: "no_updates" }, 400);
  }

  const supabase = getAdminClient();
  const supplierSkuCandidate = normalizeOptionalString(payload.supplier_sku);
  let resolvedSupplierId = supplierId;
  let resolvedSkuId = skuId;

  if (id && (!resolvedSupplierId || !resolvedSkuId)) {
    const { data: existingRow, error: existingError } = await supabase
      .from("supplier_skus")
      .select("supplier_id, sku_id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) {
      return json({ ok: false, error: "lookup_failed", message: existingError.message }, 500);
    }
    if (!existingRow) {
      return json({ ok: false, error: "not_found" }, 404);
    }
    resolvedSupplierId = resolvedSupplierId || normalizeString((existingRow as any).supplier_id);
    resolvedSkuId = resolvedSkuId || normalizeString((existingRow as any).sku_id);
  }

  if (supplierSkuCandidate && resolvedSupplierId) {
    const conflict = await findVendorSkuConflict({
      supabase,
      supplierId: resolvedSupplierId,
      supplierSku: supplierSkuCandidate,
    });
    if (conflict?.sku_id && resolvedSkuId && conflict.sku_id !== resolvedSkuId) {
      return json(
        {
          ok: false,
          error: "vendor_sku_already_mapped",
          message: "Vendor SKU already mapped for this supplier.",
          sku_id: conflict.sku_id,
          mapping_id: conflict.id,
        },
        409,
      );
    }
  }
  let query = supabase.from("supplier_skus").update(updates);
  if (id) {
    query = query.eq("id", id);
  } else {
    query = query.eq("supplier_id", resolvedSupplierId).eq("sku_id", resolvedSkuId);
  }

  const { data, error } = await query
    .select(`${MAPPING_FIELDS}, ecom_products(${ECOM_JOIN_FIELDS})`)
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const code = error.code === "23505" ? "vendor_sku_already_mapped" : "update_failed";
    return json({ ok: false, error: code, message: error.message }, status);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: SupplierSkuPayload;
  try {
    payload = (await request.json()) as SupplierSkuPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  const supplierId = normalizeString(payload.supplier_id);
  const skuId = normalizeString(payload.sku_id);

  if (!id && (!supplierId || !skuId)) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const supabase = getAdminClient();
  let query = supabase.from("supplier_skus").delete();
  if (id) {
    query = query.eq("id", id);
  } else {
    query = query.eq("supplier_id", supplierId).eq("sku_id", skuId);
  }

  const { data, error } = await query.select("id, sku_id, supplier_id, supplier_sku").maybeSingle();
  if (error) {
    return json({ ok: false, error: "delete_failed", message: error.message }, 500);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}
