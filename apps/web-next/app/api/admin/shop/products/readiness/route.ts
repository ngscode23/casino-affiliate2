import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { getStockStatus, resolveOffersForSkus } from "@/lib/pricing-inventory";

const MAPPING_FIELDS =
  "id, sku_id, supplier_id, supplier_sku, cost_cents, currency, lead_time_days, last_synced_at, last_seen_at, miss_count";
const SUPPLIER_FIELDS = "id, name, code";
const DEFAULT_STALE_HOURS = 24;

type SupplierInfo = {
  id: string;
  name: string | null;
  code: string | null;
};

type ReadinessReason =
  | "no_mapping"
  | "inventory_missing"
  | "inventory_stale"
  | "out_of_stock"
  | "offer_unavailable";

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function parseIds(input: string | null): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
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
  const skuParam =
    normalizeString(url.searchParams.get("sku_id")) ||
    normalizeString(url.searchParams.get("sku_ids")) ||
    normalizeString(url.searchParams.get("skuIds"));
  const skuIds = parseIds(skuParam);

  if (!skuIds.length) {
    return json({ ok: false, error: "sku_id_required" }, 400);
  }

  const supabase = getAdminClient();

  const { data: mappingRows, error: mappingError } = await supabase
    .from("supplier_skus")
    .select(`${MAPPING_FIELDS}, suppliers(${SUPPLIER_FIELDS})`)
    .in("sku_id", skuIds)
    .order("updated_at", { ascending: false });

  if (mappingError) {
    return json({ ok: false, error: "mapping_fetch_failed", message: mappingError.message }, 500);
  }

  const mappingsBySku = new Map<string, any[]>();
  const supplierInfoById = new Map<string, SupplierInfo>();

  for (const row of mappingRows ?? []) {
    const skuId = normalizeString((row as any)?.sku_id);
    if (!skuId) continue;
    const supplierId = normalizeString((row as any)?.supplier_id);
    const supplier = readSupplier(row);
    if (supplierId) {
      supplierInfoById.set(supplierId, {
        id: supplierId,
        name: supplier?.name ?? null,
        code: supplier?.code ?? null,
      });
    }

    const bucket = mappingsBySku.get(skuId) ?? [];
    bucket.push({
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
    mappingsBySku.set(skuId, bucket);
  }

  let offerResults: Map<string, any> = new Map();
  let inventoryBySku: Map<string, any> = new Map();

  try {
    offerResults = await resolveOffersForSkus({
      supabase,
      skuIds,
      requireInventory: true,
      staleAfterHours: DEFAULT_STALE_HOURS,
    });
    inventoryBySku = await getStockStatus({
      supabase,
      skuIds,
      staleAfterHours: DEFAULT_STALE_HOURS,
    });
  } catch (error: any) {
    return json({ ok: false, error: "readiness_failed", message: error?.message ?? "readiness_failed" }, 500);
  }

  const missingSupplierIds = new Set<string>();
  for (const result of offerResults.values()) {
    if (result?.ok && result.selection?.supplierId) {
      const supplierId = normalizeString(result.selection.supplierId);
      if (supplierId && !supplierInfoById.has(supplierId)) {
        missingSupplierIds.add(supplierId);
      }
    }
  }

  if (missingSupplierIds.size) {
    const { data: suppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .select(SUPPLIER_FIELDS)
      .in("id", Array.from(missingSupplierIds));
    if (suppliersError) {
      return json({ ok: false, error: "supplier_fetch_failed", message: suppliersError.message }, 500);
    }
    for (const row of suppliers ?? []) {
      const id = normalizeString((row as any).id);
      if (!id) continue;
      supplierInfoById.set(id, {
        id,
        name: (row as any).name ?? null,
        code: (row as any).code ?? null,
      });
    }
  }

  const items = skuIds.map((skuId) => {
    const mappings = mappingsBySku.get(skuId) ?? [];
    const offerResult = offerResults.get(skuId);
    const inventory = inventoryBySku.get(skuId);

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

    const readinessInventory = inventory
      ? {
          status: inventory.status,
          stock_quantity: inventory.stockQuantity ?? null,
          is_available: inventory.isAvailable ?? null,
          inventory_status: inventory.inventoryStatus ?? null,
          last_synced_at: inventory.lastSyncedAt ?? null,
          stale: inventory.status === "stale",
        }
      : null;

    let sellable = false;
    let reason: ReadinessReason | null = null;

    if (!mappings.length) {
      reason = "no_mapping";
    } else if (offerResult?.ok) {
      sellable = true;
      reason = null;
    } else {
      reason = (offerResult?.reason as ReadinessReason) ?? "offer_unavailable";
    }

    return {
      sku_id: skuId,
      sellable,
      reason,
      mappings,
      best_offer: bestOffer,
      inventory: readinessInventory,
    };
  });

  return json({ ok: true, items }, 200);
}
