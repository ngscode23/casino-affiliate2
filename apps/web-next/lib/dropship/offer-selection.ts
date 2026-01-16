import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient<any, any, any>;

type SupplierOfferRow = {
  id: string;
  supplier_id: string | null;
  sku_id: string | null;
  supplier_sku_id: string | null;
  price_cents: number | null;
  currency: string | null;
  cost_cents: number | null;
  lead_time_days: number | null;
};

type SupplierInventoryRow = {
  supplier_id: string | null;
  sku_id: string | null;
  is_available: boolean | null;
  inventory_status: string | null;
  stock_quantity: number | null;
  last_synced_at?: string | null;
};

export type BestOfferSelection = {
  skuId: string;
  supplierId: string;
  offerId: string;
  supplierSkuId: string | null;
  priceCents: number;
  currency: string;
  costCents: number | null;
  leadTimeDays: number | null;
  availabilityRank: number;
  stockQuantity: number | null;
  isAvailable: boolean | null;
  inventoryStatus: string | null;
  lastSyncedAt: string | null;
};

export type OfferUnavailabilityReason =
  | "out_of_stock"
  | "inventory_missing"
  | "offer_unavailable"
  | "inventory_stale";

export type BestOfferResult =
  | { ok: true; selection: BestOfferSelection }
  | { ok: false; reason: OfferUnavailabilityReason };

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function offerKey(supplierId: string, skuId: string) {
  return `${supplierId}::${skuId}`;
}

function availabilityRank(row: SupplierInventoryRow | null | undefined, requireInventory: boolean): number {
  if (!row) return requireInventory ? 2 : 1;
  const status = normalizeStatus(row.inventory_status);
  const stockQuantity = typeof row.stock_quantity === "number" ? row.stock_quantity : null;
  if (row.is_available === false) return 2;
  if (typeof stockQuantity === "number" && stockQuantity <= 0) return 2;
  if (["out_of_stock", "unavailable", "sold_out"].includes(status)) return 2;
  if (row.is_available === true) return 0;
  if (typeof stockQuantity === "number" && stockQuantity > 0) return 0;
  if (["in_stock", "available"].includes(status)) return 0;
  return 1;
}

function pickBestOffer(
  offers: SupplierOfferRow[],
  inventoryByKey: Map<string, SupplierInventoryRow>,
  requireInventory: boolean,
  staleAfterMs?: number,
): { best: BestOfferSelection | null; reason: OfferUnavailabilityReason | null } {
  const nowMs = Date.now();
  let hasOffer = false;
  let hasMissingInventory = false;
  let hasInventoryRow = false;
  let hasOutOfStock = false;
  let hasStale = false;
  let best: BestOfferSelection | null = null;

  for (const offer of offers) {
    const skuId = normalizeText(offer.sku_id ?? "");
    const supplierId = normalizeText(offer.supplier_id ?? "");
    if (!skuId || !supplierId) continue;
    const priceCents = typeof offer.price_cents === "number" ? offer.price_cents : null;
    const currency = normalizeText(offer.currency ?? "");
    if (priceCents == null || !currency) continue;
    hasOffer = true;

    const inventory = inventoryByKey.get(offerKey(supplierId, skuId));
    if (!inventory) {
      hasMissingInventory = true;
      if (requireInventory) continue;
    } else {
      hasInventoryRow = true;
      if (staleAfterMs && inventory.last_synced_at) {
        const syncedAtMs = Date.parse(inventory.last_synced_at);
        if (Number.isFinite(syncedAtMs) && nowMs - syncedAtMs > staleAfterMs) {
          hasStale = true;
          if (requireInventory) continue;
        }
      }
    }
    const rank = availabilityRank(inventory, requireInventory);
    if (rank >= 2) hasOutOfStock = true;

    const candidate: BestOfferSelection = {
      skuId,
      supplierId,
      offerId: String(offer.id ?? ""),
      supplierSkuId: offer.supplier_sku_id ?? null,
      priceCents,
      currency,
      costCents: typeof offer.cost_cents === "number" ? offer.cost_cents : null,
      leadTimeDays: typeof offer.lead_time_days === "number" ? offer.lead_time_days : null,
      availabilityRank: rank,
      stockQuantity: typeof inventory?.stock_quantity === "number" ? inventory?.stock_quantity ?? null : null,
      isAvailable: typeof inventory?.is_available === "boolean" ? inventory?.is_available ?? null : null,
      inventoryStatus:
        typeof inventory?.inventory_status === "string" ? inventory?.inventory_status ?? null : null,
      lastSyncedAt: typeof inventory?.last_synced_at === "string" ? inventory?.last_synced_at ?? null : null,
    };

    if (!best) {
      best = candidate;
      continue;
    }
    if (candidate.availabilityRank < best.availabilityRank) {
      best = candidate;
      continue;
    }
    if (candidate.availabilityRank === best.availabilityRank) {
      if (candidate.priceCents < best.priceCents) {
        best = candidate;
      }
    }
  }
  if (best) return { best, reason: null };

  let reason: OfferUnavailabilityReason = "offer_unavailable";
  if (requireInventory) {
    if (hasStale) reason = "inventory_stale";
    else if (hasMissingInventory && !hasInventoryRow) reason = "inventory_missing";
    else if (hasOutOfStock) reason = "out_of_stock";
    else if (hasMissingInventory) reason = "inventory_missing";
  } else if (!hasOffer) {
    reason = "offer_unavailable";
  } else if (hasOutOfStock) {
    reason = "out_of_stock";
  }
  return { best: null, reason };
}

export async function fetchBestOffersForSkus(params: {
  supabase: AdminClient;
  skuIds: string[];
  now?: string;
  requireInventory?: boolean;
  staleAfterHours?: number;
}): Promise<Map<string, BestOfferResult>> {
  const { supabase, skuIds, now, requireInventory = true, staleAfterHours } = params;
  const cleaned = Array.from(new Set((skuIds || []).map((id) => normalizeText(id)).filter(Boolean)));
  const results = new Map<string, BestOfferResult>();
  if (!cleaned.length) return results;

  const nowIso = now ?? new Date().toISOString();
  const { data: offerRows, error: offersError } = await supabase
    .from("supplier_offers")
    .select("id, supplier_id, sku_id, supplier_sku_id, price_cents, currency, cost_cents, lead_time_days, status, valid_to")
    .in("sku_id", cleaned)
    .eq("status", "active")
    .or(`valid_to.is.null,valid_to.gte.${nowIso}`);

  if (offersError) throw offersError;
  if (!Array.isArray(offerRows) || !offerRows.length) return results;

  const { data: inventoryRows, error: inventoryError } = await supabase
    .from("supplier_inventory_levels")
    .select("supplier_id, sku_id, is_available, inventory_status, stock_quantity, last_synced_at")
    .in("sku_id", cleaned);

  if (inventoryError) throw inventoryError;

  const inventoryByKey = new Map<string, SupplierInventoryRow>();
  if (Array.isArray(inventoryRows)) {
    for (const row of inventoryRows as SupplierInventoryRow[]) {
      const skuId = normalizeText(row.sku_id ?? "");
      const supplierId = normalizeText(row.supplier_id ?? "");
      if (!skuId || !supplierId) continue;
      inventoryByKey.set(offerKey(supplierId, skuId), row);
    }
  }

  const offersBySku = new Map<string, SupplierOfferRow[]>();
  for (const row of offerRows as SupplierOfferRow[]) {
    const skuId = normalizeText(row.sku_id ?? "");
    if (!skuId) continue;
    const bucket = offersBySku.get(skuId) ?? [];
    bucket.push(row);
    offersBySku.set(skuId, bucket);
  }

  const staleAfterMs = typeof staleAfterHours === "number" && staleAfterHours > 0 ? staleAfterHours * 3600 * 1000 : undefined;

  for (const skuId of cleaned) {
    if (!offersBySku.has(skuId)) {
      results.set(skuId, { ok: false, reason: "offer_unavailable" });
    }
  }

  for (const [skuId, offers] of offersBySku.entries()) {
    const { best, reason } = pickBestOffer(offers, inventoryByKey, requireInventory, staleAfterMs);
    if (best) {
      results.set(skuId, { ok: true, selection: best });
    } else if (reason) {
      results.set(skuId, { ok: false, reason });
    }
  }

  return results;
}
