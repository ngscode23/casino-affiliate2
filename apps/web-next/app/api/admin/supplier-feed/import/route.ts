import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  normalizeSupplierFeedItems,
  parseSupplierFeedCsv,
  type SupplierFeedNormalizedItem,
  type SupplierFeedRawItem,
} from "@/lib/integrations/suppliers/feed";
import { resolveOffersForSkus } from "@/lib/pricing-inventory";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_MISS_THRESHOLD = 3;

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function resolveMappedSkuIds(params: {
  supabase: ReturnType<typeof getAdminClient>;
  supplierId: string;
  vendorSkus: string[];
}): Promise<Map<string, string>> {
  const { supabase, supplierId, vendorSkus } = params;
  const mapping = new Map<string, string>();
  if (!vendorSkus.length) return mapping;

  for (const chunk of chunkArray(vendorSkus, 500)) {
    const { data, error } = await supabase
      .from("supplier_skus")
      .select("supplier_sku, sku_id")
      .eq("supplier_id", supplierId)
      .in("supplier_sku", chunk);
    if (error) throw error;
    if (!Array.isArray(data)) continue;
    for (const row of data) {
      const vendorSku = normalizeString((row as any).supplier_sku ?? "");
      const skuId = normalizeString((row as any).sku_id ?? "");
      if (vendorSku && skuId) mapping.set(vendorSku, skuId);
    }
  }

  return mapping;
}

async function upsertUnmappedRows(params: {
  supabase: ReturnType<typeof getAdminClient>;
  rows: Array<Record<string, unknown>>;
}): Promise<number> {
  const { supabase, rows } = params;
  if (!rows.length) return 0;
  const table = "supplier_feed_unmapped" as any;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "supplier_id,vendor_sku" });
  if (error) throw error;
  return rows.length;
}

async function updateBestOffersForSkus({
  supabase,
  skuIds,
}: {
  supabase: ReturnType<typeof getAdminClient>;
  skuIds: string[];
}): Promise<number> {
  if (!skuIds.length) return 0;
  let updated = 0;
  const results = await resolveOffersForSkus({ supabase, skuIds, requireInventory: false });
  for (const [skuId, result] of results.entries()) {
    if (!result.ok) continue;
    const selection = result.selection;
    const updates: Record<string, unknown> = {
      price_cents: selection.priceCents,
      currency: selection.currency,
      stock_quantity: selection.stockQuantity,
      is_available: selection.isAvailable,
      inventory_status: selection.inventoryStatus,
    };
    const { error } = await supabase.from("ecom_products").update(updates).eq("id", skuId);
    if (!error) updated += 1;
  }

  return updated;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";
  const url = new URL(request.url);
  const querySupplierId = url.searchParams.get("supplierId") ?? url.searchParams.get("supplier_id");
  const queryThreshold = url.searchParams.get("miss_threshold");

  let supplierId = "";
  let rawItems: SupplierFeedRawItem[] = [];
  let missThreshold = Number.isFinite(Number(queryThreshold)) ? Number(queryThreshold) : DEFAULT_MISS_THRESHOLD;

  if (contentType.includes("application/json")) {
    let payload: any = null;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: "bad_json" }, 400);
    }
    supplierId = normalizeString(payload?.supplierId ?? payload?.supplier_id ?? querySupplierId ?? "");
    missThreshold = Number.isFinite(Number(payload?.missThreshold))
      ? Number(payload.missThreshold)
      : Number.isFinite(Number(payload?.miss_threshold))
        ? Number(payload.miss_threshold)
        : missThreshold;
    rawItems = Array.isArray(payload?.items) ? (payload.items as SupplierFeedRawItem[]) : [];
  } else if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    supplierId = normalizeString(
      (form.get("supplierId") ?? form.get("supplier_id") ?? querySupplierId ?? "") as string,
    );
    const file = form.get("file") ?? form.get("feed") ?? form.get("csv");
    if (file instanceof File) {
      const text = await file.text();
      rawItems = parseSupplierFeedCsv(text);
    }
  } else {
    const text = await request.text();
    supplierId = normalizeString(querySupplierId ?? "");
    rawItems = parseSupplierFeedCsv(text);
  }

  if (!supplierId || !UUID_PATTERN.test(supplierId)) {
    return json({ ok: false, error: "supplier_id_required" }, 400);
  }

  if (!rawItems.length) {
    return json({ ok: false, error: "no_items" }, 400);
  }

  const supabase = getAdminClient();
  const { data: supplierRow, error: supplierError } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", supplierId)
    .maybeSingle();
  if (supplierError || !supplierRow) {
    return json({ ok: false, error: "supplier_not_found" }, 404);
  }

  const normalized = normalizeSupplierFeedItems(rawItems);
  const vendorSkus = Array.from(
    new Set(normalized.map((item) => normalizeString(item.supplier_sku)).filter((sku) => sku.length)),
  );
  let mappedSkuIds: Map<string, string>;
  try {
    mappedSkuIds = await resolveMappedSkuIds({ supabase, supplierId, vendorSkus });
  } catch (error: any) {
    return json({ ok: false, error: "mapping_lookup_failed", message: error?.message || "mapping_lookup_failed" }, 500);
  }

  const errors: Array<{ reason: string; item: SupplierFeedNormalizedItem }> = [];
  const warnings: Array<{ reason: string; item: SupplierFeedNormalizedItem }> = [];
  const mappedItems: SupplierFeedNormalizedItem[] = [];
  const unmappedItems: SupplierFeedNormalizedItem[] = [];

  for (const item of normalized) {
    const vendorSku = normalizeString(item.supplier_sku);
    if (!vendorSku) {
      errors.push({ reason: "missing_vendor_sku", item });
      continue;
    }
    if (!item.currency) {
      errors.push({ reason: "missing_currency", item: { ...item, supplier_sku: vendorSku } });
      continue;
    }
    if (item.price_cents == null) {
      errors.push({ reason: "missing_price_cents", item: { ...item, supplier_sku: vendorSku } });
      continue;
    }

    const mappedSkuId = mappedSkuIds.get(vendorSku);
    if (!mappedSkuId) {
      const unmapped = { ...item, supplier_sku: vendorSku };
      unmappedItems.push(unmapped);
      warnings.push({ reason: "unmapped_vendor_sku", item: unmapped });
      continue;
    }

    if (item.sku_id && item.sku_id !== mappedSkuId) {
      warnings.push({ reason: "mapping_conflict", item: { ...item, sku_id: mappedSkuId, supplier_sku: vendorSku } });
    }
    mappedItems.push({ ...item, sku_id: mappedSkuId, supplier_sku: vendorSku });
  }

  const startedAt = new Date().toISOString();
  const runInsert = await supabase
    .from("supplier_feed_runs")
    .insert({
      supplier_id: supplierId,
      status: "running",
      started_at: startedAt,
      stats: { received: rawItems.length },
    })
    .select("id")
    .maybeSingle();
  const runId = runInsert.data?.id ?? null;

  const processedCount = normalized.length;
  const mappedCount = mappedItems.length;
  const unmappedCount = unmappedItems.length;
  const invalidCount = errors.length;
  const warningItems = [...errors, ...warnings];
  const validCount = mappedCount + unmappedCount;

  if (!validCount) {
    if (runId) {
      await supabase
        .from("supplier_feed_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: "no_valid_items",
          stats: {
            received: rawItems.length,
            processed: processedCount,
            mapped: mappedCount,
            unmapped: unmappedCount,
            invalid: invalidCount,
            failed: invalidCount,
          },
        })
        .eq("id", runId);
    }
    return json({ ok: false, error: "no_valid_items", runId, details: errors.slice(0, 25) }, 400);
  }

  const now = new Date().toISOString();
  const unmappedRows = unmappedItems.map((item) => ({
    supplier_id: supplierId,
    vendor_sku: item.supplier_sku,
    last_seen_at: now,
    sample_payload: { ...item, run_id: runId },
    updated_at: now,
  }));

  let upsertRows: Array<Record<string, unknown>> = [];
  let inventoryRows: Array<Record<string, unknown>> = [];
  let offerRows: Array<Record<string, unknown>> = [];
  let missingRows: Array<{ id: string; sku_id: string; miss_count: number | null }> = [];
  const seenSkuIds = Array.from(new Set(mappedItems.map((item) => item.sku_id).filter(Boolean)));

  try {
    let unmappedUpserted = 0;
    if (unmappedRows.length) {
      unmappedUpserted = await upsertUnmappedRows({ supabase, rows: unmappedRows });
    }

    if (mappedItems.length) {
      upsertRows = mappedItems.map((item) => {
        const row: Record<string, unknown> = {
          supplier_id: supplierId,
          sku_id: item.sku_id,
          supplier_sku: item.supplier_sku,
          last_synced_at: now,
          last_seen_at: now,
          miss_count: 0,
        };
        if (item.cost_cents != null) row.cost_cents = item.cost_cents;
        if (item.currency) row.currency = item.currency;
        if (item.lead_time_days != null) row.lead_time_days = item.lead_time_days;
        return row;
      });

      inventoryRows = mappedItems.map((item) => ({
        supplier_id: supplierId,
        sku_id: item.sku_id,
        stock_quantity: item.stock_quantity,
        is_available: item.is_available,
        inventory_status: item.inventory_status,
        last_synced_at: now,
        source: "feed",
        metadata: { run_id: runId },
        updated_at: now,
      }));

      offerRows = mappedItems.map((item) => ({
        supplier_id: supplierId,
        sku_id: item.sku_id,
        price_cents: item.price_cents,
        currency: item.currency,
        cost_cents: item.cost_cents,
        lead_time_days: item.lead_time_days,
        status: "active",
        valid_from: now,
        valid_to: null,
        updated_at: now,
      }));

      const { error: upsertError } = await supabase
        .from("supplier_skus")
        .upsert(upsertRows, { onConflict: "supplier_id,sku_id" });
      if (upsertError) throw upsertError;

      const { error: inventoryError } = await supabase
        .from("supplier_inventory_levels")
        .upsert(inventoryRows, { onConflict: "supplier_id,sku_id" });
      if (inventoryError) throw inventoryError;

      const { error: offerError } = await supabase
        .from("supplier_offers")
        .upsert(offerRows, { onConflict: "supplier_id,sku_id" });
      if (offerError) throw offerError;
    }

    const { data: allRows, error: missingError } = await supabase
      .from("supplier_skus")
      .select("id, miss_count, sku_id")
      .eq("supplier_id", supplierId);
    if (missingError) throw missingError;
    if (Array.isArray(allRows)) {
      const seenSet = new Set(seenSkuIds);
      missingRows = allRows
        .filter((row) => !seenSet.has(String((row as any).sku_id)))
        .map((row) => ({
          id: String((row as any).id),
          sku_id: String((row as any).sku_id ?? ""),
          miss_count: typeof (row as any).miss_count === "number" ? (row as any).miss_count : null,
        }));
    }

    const disabledSkuIds: string[] = [];
    const missUpdates =
      mappedItems.length > 0
        ? missingRows.map((row) => {
            const current = typeof row.miss_count === "number" ? row.miss_count : 0;
            const next = current + 1;
            const disable = next >= missThreshold;
            if (disable && row.sku_id) disabledSkuIds.push(row.sku_id);
            return {
              id: row.id,
              miss_count: next,
            };
          })
        : [];

    if (missUpdates.length) {
      await supabase.from("supplier_skus").upsert(missUpdates, { onConflict: "id" });
    }

    const disabledCount = missUpdates.filter((row) => row.miss_count >= missThreshold).length;

    if (disabledSkuIds.length) {
      const disabledInventoryUpdates = disabledSkuIds.map((skuId) => ({
        supplier_id: supplierId,
        sku_id: skuId,
        stock_quantity: 0,
        is_available: false,
        inventory_status: "out_of_stock",
        last_synced_at: now,
        source: "miss",
        metadata: { run_id: runId },
        updated_at: now,
      }));
      await supabase.from("supplier_inventory_levels").upsert(disabledInventoryUpdates, {
        onConflict: "supplier_id,sku_id",
      });
    }

    const recomputeSkuIds = Array.from(new Set([...seenSkuIds, ...disabledSkuIds]));
    const ecomUpdatedCount = mappedItems.length
      ? await updateBestOffersForSkus({ supabase, skuIds: recomputeSkuIds })
      : 0;

    if (runId) {
      await supabase
        .from("supplier_feed_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          error: warningItems.length ? "partial_failures" : null,
          stats: {
            received: rawItems.length,
            processed: processedCount,
            mapped: mappedCount,
            unmapped: unmappedCount,
            invalid: invalidCount,
            parsed: mappedCount,
            failed: invalidCount,
            upserted: upsertRows.length,
            offers_upserted: offerRows.length,
            inventory_upserted: inventoryRows.length,
            ecom_updated: ecomUpdatedCount,
            missing: missUpdates.length,
            disabled: disabledCount,
            unmapped_upserted: unmappedUpserted,
          },
        })
        .eq("id", runId);
    }

    return json({
      ok: true,
      runId,
      stats: {
        received: rawItems.length,
        processed: processedCount,
        mapped: mappedCount,
        unmapped: unmappedCount,
        invalid: invalidCount,
        parsed: mappedCount,
        failed: invalidCount,
        upserted: upsertRows.length,
        offers_upserted: offerRows.length,
        inventory_upserted: inventoryRows.length,
        ecom_updated: ecomUpdatedCount,
        missing: missUpdates.length,
        disabled: disabledCount,
        unmapped_upserted: unmappedUpserted,
      },
      warnings: warningItems.slice(0, 25),
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object"
          ? JSON.stringify(err)
          : String(err);
    if (runId) {
      await supabase
        .from("supplier_feed_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: message,
          stats: {
            received: rawItems.length,
            processed: processedCount,
            mapped: mappedCount,
            unmapped: unmappedCount,
            invalid: invalidCount,
            parsed: mappedCount,
            failed: invalidCount,
          },
        })
        .eq("id", runId);
    }
    return json({ ok: false, error: "import_failed", message, runId }, 500);
  }
}
