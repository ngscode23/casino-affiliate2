import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const MAPPING_FIELDS =
  "id, supplier_id, sku_id, supplier_sku, cost_cents, currency, lead_time_days, last_synced_at, last_seen_at, miss_count, created_at, updated_at";
const ECOM_JOIN_FIELDS = "id, sku, slug, title, currency, price_cents, is_available, inventory_status, stock_quantity";

type MapPayload = {
  supplier_id?: string;
  sku_id?: string;
  vendor_sku?: string;
  supplier_sku?: string;
  cost_cents?: number | string | null;
  currency?: string | null;
  lead_time_days?: number | string | null;
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

async function resolveSupplierCurrency(supplierId: string): Promise<string> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("suppliers").select("default_currency").eq("id", supplierId).maybeSingle();
  const currency = normalizeString((data as { default_currency?: string | null } | null)?.default_currency ?? "");
  return currency ? currency.toUpperCase() : "USD";
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

async function deleteUnmappedRow(params: { supabase: ReturnType<typeof getAdminClient>; supplierId: string; vendorSku: string }) {
  const { supabase, supplierId, vendorSku } = params;
  const table = "supplier_feed_unmapped" as any;
  await supabase.from(table).delete().eq("supplier_id", supplierId).eq("vendor_sku", vendorSku);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: MapPayload;
  try {
    payload = (await request.json()) as MapPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const supplierId = normalizeString(payload.supplier_id);
  const skuId = normalizeString(payload.sku_id);
  const vendorSku = normalizeOptionalString(payload.vendor_sku ?? payload.supplier_sku);

  if (!supplierId || !skuId || !vendorSku) {
    return json({ ok: false, error: "mapping_required" }, 400);
  }

  const supabase = getAdminClient();
  const conflict = await findVendorSkuConflict({ supabase, supplierId, supplierSku: vendorSku });
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
    supplier_sku: vendorSku,
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

  await deleteUnmappedRow({ supabase, supplierId, vendorSku });

  return json({ ok: true, item: data }, 200);
}
