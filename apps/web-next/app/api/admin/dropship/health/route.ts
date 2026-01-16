import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const DEFAULT_LIMIT = 2000;
const MAX_LIMIT = 5000;
const DEFAULT_SAMPLE = 25;
const DEFAULT_STALE_HOURS = 24;
const ALLOWED_STATUSES = new Set(["published", "active"]);

type SkuRow = {
  id: string;
  sku: string | null;
  title: string | null;
  status: string | null;
  is_available: boolean | null;
  inventory_status: string | null;
  stock_quantity: number | null;
};

type InventoryRow = {
  sku_id: string | null;
  is_available: boolean | null;
  inventory_status: string | null;
  stock_quantity: number | null;
  last_synced_at?: string | null;
};

type SkuInfo = {
  id: string;
  sku: string | null;
  title: string | null;
};

function normalizeStatus(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isSkuActive(row: SkuRow): boolean {
  const status = normalizeStatus(row.status);
  return !status || ALLOWED_STATUSES.has(status);
}

function isSkuAvailable(row: SkuRow): boolean {
  if (row.is_available === false) return false;
  const inventory = normalizeStatus(row.inventory_status);
  if (inventory === "out_of_stock") return false;
  return true;
}

function availabilityRank(row: InventoryRow | null | undefined): number {
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

function parseNumber(value: string | null, fallback: number): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const limit = clamp(parseNumber(url.searchParams.get("limit"), DEFAULT_LIMIT), 50, MAX_LIMIT);
  const sample = clamp(parseNumber(url.searchParams.get("sample"), DEFAULT_SAMPLE), 5, 100);
  const staleHours = clamp(parseNumber(url.searchParams.get("stale_hours"), DEFAULT_STALE_HOURS), 1, 168);

  const supabase = getAdminClient();

  const { count: totalSkus } = await supabase
    .from("ecom_products")
    .select("id", { count: "exact", head: true });

  const { data: skuRows, error: skuError } = await supabase
    .from("ecom_products")
    .select("id, sku, title, status, is_available, inventory_status, stock_quantity")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (skuError) {
    return json({ ok: false, error: "sku_lookup_failed", message: skuError.message }, 500);
  }

  const skuList = (skuRows ?? []) as SkuRow[];
  const infoById = new Map<string, SkuInfo>();
  const inactiveProducts: string[] = [];
  const activeSkuIds: string[] = [];

  for (const row of skuList) {
    if (!row?.id) continue;
    const info = { id: row.id, sku: row.sku ?? null, title: row.title ?? null };
    infoById.set(row.id, info);
    if (!isSkuActive(row) || !isSkuAvailable(row)) {
      inactiveProducts.push(row.id);
    }
    if (isSkuActive(row)) {
      activeSkuIds.push(row.id);
    }
  }

  const offerSkuIds = new Set<string>();
  const inventoryBySku = new Map<string, InventoryRow[]>();
  const skuChunks = chunk(activeSkuIds, 200);

  try {
    for (const chunkIds of skuChunks) {
      const { data: offerRows, error: offerError } = await supabase
        .schema("pricing")
        .from("active_offers_v")
        .select("sku_id")
        .in("sku_id", chunkIds);
      if (offerError) throw offerError;
      for (const row of offerRows ?? []) {
        const skuId = (row as any)?.sku_id as string | undefined;
        if (skuId) offerSkuIds.add(skuId);
      }

      const { data: inventoryRows, error: inventoryError } = await supabase
        .schema("inventory")
        .from("sku_availability_v")
        .select("sku_id, is_available, inventory_status, stock_quantity, last_synced_at")
        .in("sku_id", chunkIds);
      if (inventoryError) throw inventoryError;
      for (const row of inventoryRows ?? []) {
        const skuId = (row as any)?.sku_id as string | undefined;
        if (!skuId) continue;
        const bucket = inventoryBySku.get(skuId) ?? [];
        bucket.push(row as InventoryRow);
        inventoryBySku.set(skuId, bucket);
      }
    }
  } catch (error: any) {
    return json({ ok: false, error: "health_query_failed", message: error?.message || String(error) }, 500);
  }

  const skusWithoutOffers: string[] = [];
  const inventoryMissing: string[] = [];
  const outOfStock: string[] = [];
  const inventoryStale: string[] = [];
  const staleAfterMs = staleHours * 3600 * 1000;

  for (const skuId of activeSkuIds) {
    if (!offerSkuIds.has(skuId)) {
      skusWithoutOffers.push(skuId);
    }

    const inventoryRows = inventoryBySku.get(skuId) ?? [];
    if (!inventoryRows.length) {
      inventoryMissing.push(skuId);
      continue;
    }

    let bestRank = 99;
    let latestSynced = Number.NaN;

    for (const row of inventoryRows) {
      const rank = availabilityRank(row);
      if (rank < bestRank) bestRank = rank;

      if (row.last_synced_at) {
        const parsed = Date.parse(row.last_synced_at);
        if (Number.isFinite(parsed)) {
          if (!Number.isFinite(latestSynced) || parsed > latestSynced) {
            latestSynced = parsed;
          }
        }
      }
    }

    if (bestRank >= 2) {
      outOfStock.push(skuId);
    }

    if (Number.isFinite(latestSynced) && Date.now() - latestSynced > staleAfterMs) {
      inventoryStale.push(skuId);
    }
  }

  const toSample = (ids: string[]) =>
    ids.slice(0, sample).map((id) => infoById.get(id) ?? { id, sku: null, title: null });

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    limit,
    stale_hours: staleHours,
    truncated: typeof totalSkus === "number" ? totalSkus > skuList.length : false,
    counts: {
      total_skus: totalSkus ?? skuList.length,
      active_skus: activeSkuIds.length,
      inactive_products: inactiveProducts.length,
      skus_without_offers: skusWithoutOffers.length,
      inventory_missing: inventoryMissing.length,
      out_of_stock: outOfStock.length,
      inventory_stale: inventoryStale.length,
    },
    samples: {
      inactive_products: toSample(inactiveProducts),
      skus_without_offers: toSample(skusWithoutOffers),
      inventory_missing: toSample(inventoryMissing),
      out_of_stock: toSample(outOfStock),
      inventory_stale: toSample(inventoryStale),
    },
  });
}
