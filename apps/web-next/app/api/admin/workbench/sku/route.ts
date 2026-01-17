import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { getStockStatus, resolveOffersForSkus } from "@/lib/pricing-inventory";

const MAPPING_FIELDS =
  "id, sku_id, supplier_id, supplier_sku, cost_cents, currency, lead_time_days, last_synced_at, last_seen_at, miss_count";
const SUPPLIER_FIELDS = "id, name, code";
const SKU_FIELDS = "id, sku, slug, title, currency, price_cents, status, created_at";
const DEFAULT_STALE_HOURS = 24;

type SupplierInfo = {
  id: string;
  name: string | null;
  code: string | null;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function readSupplier(row: any): SupplierInfo | null {
  const value = row?.suppliers ?? null;
  if (Array.isArray(value)) {
    return value[0] ? (value[0] as SupplierInfo) : null;
  }
  if (value && typeof value === "object") {
    return value as SupplierInfo;
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const skuId =
    normalizeString(url.searchParams.get("sku_id")) ||
    normalizeString(url.searchParams.get("skuId")) ||
    normalizeString(url.searchParams.get("sku"));

  if (!skuId) {
    return json({ ok: false, error: "sku_id_required" }, 400);
  }

  const supabase = getAdminClient();

  const { data: skuRow, error: skuError } = await supabase
    .from("ecom_products")
    .select(SKU_FIELDS)
    .eq("id", skuId)
    .maybeSingle();

  if (skuError) {
    return json({ ok: false, error: "sku_fetch_failed", message: skuError.message }, 500);
  }

  if (!skuRow) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  const { data: mappingRows, error: mappingError } = await supabase
    .from("supplier_skus")
    .select(`${MAPPING_FIELDS}, suppliers(${SUPPLIER_FIELDS})`)
    .eq("sku_id", skuId)
    .order("updated_at", { ascending: false });

  if (mappingError) {
    return json({ ok: false, error: "mapping_fetch_failed", message: mappingError.message }, 500);
  }

  const mappings: any[] = [];
  const supplierInfoById = new Map<string, SupplierInfo>();

  for (const row of mappingRows ?? []) {
    const supplierId = normalizeString((row as any)?.supplier_id);
    const supplier = readSupplier(row);
    if (supplierId) {
      supplierInfoById.set(supplierId, {
        id: supplierId,
        name: supplier?.name ?? null,
        code: supplier?.code ?? null,
      });
    }
    mappings.push({
      id: (row as any).id,
      supplier_id: supplierId,
      supplier_name: supplier?.name ?? null,
      supplier_code: supplier?.code ?? null,
      supplier_sku: (row as any).supplier_sku ?? null,
      cost_cents: (row as any).cost_cents ?? null,
      currency: (row as any).currency ?? null,
      lead_time_days: (row as any).lead_time_days ?? null,
      last_synced_at: (row as any).last_synced_at ?? null,
      last_seen_at: (row as any).last_seen_at ?? null,
      miss_count: (row as any).miss_count ?? null,
      status: "mapped",
    });
  }

  let offerResults: Map<string, any> = new Map();
  let inventoryBySku: Map<string, any> = new Map();

  try {
    offerResults = await resolveOffersForSkus({
      supabase,
      skuIds: [skuId],
      requireInventory: true,
      staleAfterHours: DEFAULT_STALE_HOURS,
    });
    inventoryBySku = await getStockStatus({ supabase, skuIds: [skuId], staleAfterHours: DEFAULT_STALE_HOURS });
  } catch (error: any) {
    return json({ ok: false, error: "readiness_failed", message: error?.message ?? "readiness_failed" }, 500);
  }

  const offerResult = offerResults.get(skuId);
  if (offerResult?.ok && offerResult.selection?.supplierId) {
    const supplierId = normalizeString(offerResult.selection.supplierId);
    if (supplierId && !supplierInfoById.has(supplierId)) {
      const { data: suppliers, error: supplierError } = await supabase
        .from("suppliers")
        .select(SUPPLIER_FIELDS)
        .eq("id", supplierId)
        .maybeSingle();
      if (supplierError) {
        return json({ ok: false, error: "supplier_fetch_failed", message: supplierError.message }, 500);
      }
      if (suppliers) {
        supplierInfoById.set(supplierId, {
          id: supplierId,
          name: (suppliers as any).name ?? null,
          code: (suppliers as any).code ?? null,
        });
      }
    }
  }

  const bestOffer = offerResult?.ok
    ? (() => {
        const selection = offerResult.selection;
        const supplierInfo = supplierInfoById.get(selection.supplierId);
        return {
          supplierId: selection.supplierId,
          supplier_name: supplierInfo?.name ?? null,
          supplier_code: supplierInfo?.code ?? null,
          offerId: selection.offerId,
          supplierSkuId: selection.supplierSkuId ?? null,
          priceCents: selection.priceCents,
          currency: selection.currency,
          costCents: selection.costCents ?? null,
          leadTimeDays: selection.leadTimeDays ?? null,
          stockQuantity: selection.stockQuantity ?? null,
          isAvailable: selection.isAvailable ?? null,
          inventoryStatus: selection.inventoryStatus ?? null,
          lastSyncedAt: selection.lastSyncedAt ?? null,
        };
      })()
    : null;

  const inventoryRow = inventoryBySku.get(skuId);
  const readinessInventory = inventoryRow
    ? {
        status: inventoryRow.status,
        stock_quantity: inventoryRow.stockQuantity ?? null,
        is_available: inventoryRow.isAvailable ?? null,
        inventory_status: inventoryRow.inventoryStatus ?? null,
        last_synced_at: inventoryRow.lastSyncedAt ?? null,
        stale: inventoryRow.status === "stale",
      }
    : null;

  let sellable = false;
  let reason: string | null = null;

  if (!mappings.length) {
    reason = "no_mapping";
  } else if (offerResult?.ok) {
    sellable = true;
    reason = null;
  } else {
    reason = offerResult?.reason ?? "offer_unavailable";
  }

  return json(
    {
      ok: true,
      sku: skuRow,
      readiness: {
        sku_id: skuId,
        sellable,
        reason,
        mappings,
        best_offer: bestOffer,
        inventory: readinessInventory,
      },
    },
    200,
  );
}
