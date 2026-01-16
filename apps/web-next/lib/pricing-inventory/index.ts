import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fetchBestOffersForSkus,
  type BestOfferResult,
  type BestOfferSelection,
  type OfferUnavailabilityReason,
} from "@/lib/dropship/offer-selection";

type AdminClient = SupabaseClient<any, any, any>;

type SupplierInventoryRow = {
  sku_id: string | null;
  is_available: boolean | null;
  inventory_status: string | null;
  stock_quantity: number | null;
  last_synced_at?: string | null;
};

export type { BestOfferResult, BestOfferSelection, OfferUnavailabilityReason };

export async function resolveOffersForSkus(params: {
  supabase: AdminClient;
  skuIds: string[];
  now?: string;
  requireInventory?: boolean;
  staleAfterHours?: number;
}): Promise<Map<string, BestOfferResult>> {
  return fetchBestOffersForSkus(params);
}

export async function resolveOfferForSku(params: {
  supabase: AdminClient;
  skuId: string;
  now?: string;
  requireInventory?: boolean;
  staleAfterHours?: number;
}): Promise<BestOfferResult> {
  const { skuId, ...rest } = params;
  const results = await resolveOffersForSkus({ ...rest, skuIds: [skuId] });
  return results.get(skuId) ?? { ok: false, reason: "offer_unavailable" };
}

export type StockStatus = {
  skuId: string;
  status: "in_stock" | "out_of_stock" | "unknown" | "stale" | "missing";
  stockQuantity: number | null;
  isAvailable: boolean | null;
  inventoryStatus: string | null;
  lastSyncedAt: string | null;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function availabilityRank(row: SupplierInventoryRow | null | undefined): number {
  if (!row) return 1;
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

function parseTimestamp(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function getStockStatus(params: {
  supabase: AdminClient;
  skuIds: string[];
  staleAfterHours?: number;
}): Promise<Map<string, StockStatus>> {
  const { supabase, skuIds, staleAfterHours } = params;
  const cleaned = Array.from(new Set((skuIds || []).map((id) => normalizeText(id)).filter(Boolean)));
  const results = new Map<string, StockStatus>();
  if (!cleaned.length) return results;

  const { data, error } = await supabase
    .from("supplier_inventory_levels")
    .select("sku_id, is_available, inventory_status, stock_quantity, last_synced_at")
    .in("sku_id", cleaned);

  if (error) throw error;

  const grouped = new Map<string, SupplierInventoryRow[]>();
  if (Array.isArray(data)) {
    for (const row of data as SupplierInventoryRow[]) {
      const skuId = normalizeText(row.sku_id ?? "");
      if (!skuId) continue;
      const bucket = grouped.get(skuId) ?? [];
      bucket.push(row);
      grouped.set(skuId, bucket);
    }
  }

  const staleAfterMs = typeof staleAfterHours === "number" && staleAfterHours > 0
    ? staleAfterHours * 3600 * 1000
    : null;

  for (const skuId of cleaned) {
    const rows = grouped.get(skuId) ?? [];
    if (!rows.length) {
      results.set(skuId, {
        skuId,
        status: "missing",
        stockQuantity: null,
        isAvailable: null,
        inventoryStatus: null,
        lastSyncedAt: null,
      });
      continue;
    }

    let best: SupplierInventoryRow | null = null;
    let bestRank = 99;
    let bestSyncedAtMs = Number.NaN;

    for (const row of rows) {
      const rank = availabilityRank(row);
      const syncedAtMs = parseTimestamp(row.last_synced_at ?? null);
      if (!best || rank < bestRank) {
        best = row;
        bestRank = rank;
        bestSyncedAtMs = syncedAtMs;
        continue;
      }
      if (rank === bestRank) {
        const currentMs = Number.isFinite(syncedAtMs) ? syncedAtMs : -Infinity;
        const previousMs = Number.isFinite(bestSyncedAtMs) ? bestSyncedAtMs : -Infinity;
        if (currentMs > previousMs) {
          best = row;
          bestSyncedAtMs = syncedAtMs;
        }
      }
    }

    const status = (() => {
      if (!best) return "unknown" as const;
      if (bestRank <= 0) return "in_stock" as const;
      if (bestRank >= 2) return "out_of_stock" as const;
      return "unknown" as const;
    })();

    const stale =
      best && staleAfterMs && Number.isFinite(bestSyncedAtMs)
        ? Date.now() - bestSyncedAtMs > staleAfterMs
        : false;

    results.set(skuId, {
      skuId,
      status: stale ? "stale" : status,
      stockQuantity: typeof best?.stock_quantity === "number" ? best?.stock_quantity ?? null : null,
      isAvailable: typeof best?.is_available === "boolean" ? best?.is_available ?? null : null,
      inventoryStatus: typeof best?.inventory_status === "string" ? best?.inventory_status ?? null : null,
      lastSyncedAt: typeof best?.last_synced_at === "string" ? best?.last_synced_at ?? null : null,
    });
  }

  return results;
}
