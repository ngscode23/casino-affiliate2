import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_MISS_THRESHOLD = 3;

type RawItem = Record<string, unknown>;
type NormalizedItem = {
  sku_id: string;
  supplier_sku: string;
  cost_cents: number | null;
  price_cents: number | null;
  currency: string | null;
  stock_quantity: number | null;
  is_available: boolean | null;
  inventory_status: string | null;
  lead_time_days: number | null;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function parseNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseBoolean(input: unknown): boolean | null {
  if (typeof input === "boolean") return input;
  if (typeof input === "number") return input > 0;
  if (typeof input === "string") {
    const value = input.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(value)) return true;
    if (["false", "0", "no", "n"].includes(value)) return false;
  }
  return null;
}

function normalizeCurrency(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  return value.toUpperCase();
}

function normalizeInventoryStatus(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  return value || null;
}

function toPriceCents(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value);
}

function toMinorUnits(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function deriveInventoryStatus(isAvailable: boolean | null, stockQuantity: number | null, rawStatus: string | null): string | null {
  if (rawStatus) return rawStatus;
  if (isAvailable === false) return "out_of_stock";
  if (typeof stockQuantity === "number" && stockQuantity <= 0) return "out_of_stock";
  if (isAvailable === true) return "in_stock";
  return null;
}

function deriveIsAvailable(isAvailable: boolean | null, stockQuantity: number | null, inventoryStatus: string | null): boolean | null {
  if (typeof isAvailable === "boolean") return isAvailable;
  if (typeof stockQuantity === "number") return stockQuantity > 0;
  if (inventoryStatus === "out_of_stock" || inventoryStatus === "unavailable" || inventoryStatus === "sold_out") {
    return false;
  }
  if (inventoryStatus === "in_stock") return true;
  return null;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === "\"") {
        const next = text[i + 1];
        if (next === "\"") {
          field += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "_");
}

function mapHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    if (!key) return;
    map[key] = index;
  });
  return map;
}

function readValue(row: string[], headerMap: Record<string, number>, keys: string[]): string | null {
  for (const key of keys) {
    const idx = headerMap[key];
    if (idx === undefined) continue;
    const value = row[idx] ?? "";
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function parseCsvRows(rows: string[][]): RawItem[] {
  if (!rows.length) return [];
  const headerMap = mapHeaders(rows[0] ?? []);
  return rows.slice(1).map((row) => {
    const priceRaw = readValue(row, headerMap, ["price_cents", "price"]);
    const costRaw = readValue(row, headerMap, ["cost_cents", "cost"]);
    const priceNumber = parseNumber(priceRaw);
    const costNumber = parseNumber(costRaw);

    const isPriceCents = headerMap.price_cents !== undefined;
    const isCostCents = headerMap.cost_cents !== undefined;

    return {
      sku_id: readValue(row, headerMap, ["sku_id", "skuid", "sku"]) ?? undefined,
      supplier_sku: readValue(row, headerMap, ["supplier_sku", "vendor_sku", "supplier_sku_id"]) ?? undefined,
      price_cents: priceNumber == null ? undefined : isPriceCents ? toPriceCents(priceNumber) : toMinorUnits(priceNumber),
      cost_cents: costNumber == null ? undefined : isCostCents ? toPriceCents(costNumber) : toMinorUnits(costNumber),
      currency: readValue(row, headerMap, ["currency", "curr"]) ?? undefined,
      stock_quantity: parseNumber(readValue(row, headerMap, ["stock_quantity", "stock", "quantity"])),
      is_available: parseBoolean(readValue(row, headerMap, ["is_available", "available"])),
      inventory_status: readValue(row, headerMap, ["inventory_status", "status"]),
      lead_time_days: parseNumber(readValue(row, headerMap, ["lead_time_days", "lead_time"])),
    };
  });
}

function normalizeItem(raw: RawItem): NormalizedItem | null {
  const sku_id = normalizeString(raw.sku_id ?? raw.skuId ?? raw["sku-id"] ?? "");
  const supplier_sku = normalizeString(raw.supplier_sku ?? raw.vendor_sku ?? raw.supplierSku ?? raw.sku ?? "");
  const currency = normalizeCurrency(raw.currency ?? null);

  const costRaw = parseNumber(raw.cost_cents ?? raw.cost ?? null);
  const priceRaw = parseNumber(raw.price_cents ?? raw.price ?? null);
  const cost_cents = raw.cost_cents != null ? toPriceCents(costRaw) : toMinorUnits(costRaw);
  const price_cents = raw.price_cents != null ? toPriceCents(priceRaw) : toMinorUnits(priceRaw);

  const stockQuantity = parseNumber(raw.stock_quantity ?? raw.stock ?? raw.quantity ?? null);
  const isAvailable = parseBoolean(raw.is_available ?? raw.available ?? null);
  const inventoryStatus = normalizeInventoryStatus(raw.inventory_status ?? raw.status ?? null);
  const leadTimeDays = parseNumber(raw.lead_time_days ?? raw.lead_time ?? null);

  const resolvedInventoryStatus = deriveInventoryStatus(isAvailable, stockQuantity, inventoryStatus);
  const resolvedIsAvailable = deriveIsAvailable(isAvailable, stockQuantity, resolvedInventoryStatus);

  return {
    sku_id,
    supplier_sku,
    cost_cents,
    price_cents,
    currency,
    stock_quantity: stockQuantity == null ? null : Math.round(stockQuantity),
    is_available: resolvedIsAvailable,
    inventory_status: resolvedInventoryStatus,
    lead_time_days: leadTimeDays == null ? null : Math.round(leadTimeDays),
  };
}

async function resolveSkuIds(
  supabase: ReturnType<typeof getAdminClient>,
  items: NormalizedItem[],
): Promise<NormalizedItem[]> {
  const unresolved = items.filter((item) => !item.sku_id && item.supplier_sku);
  if (!unresolved.length) return items;

  const supplierSkus = Array.from(new Set(unresolved.map((item) => item.supplier_sku).filter(Boolean)));
  if (!supplierSkus.length) return items;

  const { data, error } = await supabase
    .from("ecom_products")
    .select("id, sku")
    .in("sku", supplierSkus);

  if (error || !Array.isArray(data)) return items;

  const skuMap = new Map<string, string>();
  for (const row of data) {
    const sku = normalizeString((row as any).sku ?? "");
    const id = normalizeString((row as any).id ?? "");
    if (sku && id) skuMap.set(sku, id);
  }

  return items.map((item) => {
    if (item.sku_id || !item.supplier_sku) return item;
    const skuId = skuMap.get(item.supplier_sku);
    return skuId ? { ...item, sku_id: skuId } : item;
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";
  const url = new URL(request.url);
  const querySupplierId = url.searchParams.get("supplierId") ?? url.searchParams.get("supplier_id");
  const queryThreshold = url.searchParams.get("miss_threshold");

  let supplierId = "";
  let rawItems: RawItem[] = [];
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
    rawItems = Array.isArray(payload?.items) ? (payload.items as RawItem[]) : [];
  } else if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    supplierId = normalizeString(
      (form.get("supplierId") ?? form.get("supplier_id") ?? querySupplierId ?? "") as string,
    );
    const file = form.get("file") ?? form.get("feed") ?? form.get("csv");
    if (file instanceof File) {
      const text = await file.text();
      rawItems = parseCsvRows(parseCsv(text));
    }
  } else {
    const text = await request.text();
    supplierId = normalizeString(querySupplierId ?? "");
    rawItems = parseCsvRows(parseCsv(text));
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

  const normalized = rawItems
    .map((row) => normalizeItem(row))
    .filter((item): item is NormalizedItem => Boolean(item));
  let resolvedItems = await resolveSkuIds(supabase, normalized);

  resolvedItems = resolvedItems.map((item) => ({
    ...item,
    supplier_sku: item.supplier_sku || item.sku_id,
  }));

  const errors: Array<{ reason: string; item: NormalizedItem }> = [];
  resolvedItems = resolvedItems.filter((item) => {
    if (!item.sku_id || !UUID_PATTERN.test(item.sku_id)) {
      errors.push({ reason: "missing_sku_id", item });
      return false;
    }
    if (!item.supplier_sku) {
      errors.push({ reason: "missing_supplier_sku", item });
      return false;
    }
    if (!item.currency) {
      errors.push({ reason: "missing_currency", item });
      return false;
    }
    if (item.price_cents == null) {
      errors.push({ reason: "missing_price_cents", item });
      return false;
    }
    return true;
  });

  const candidateSkuIds = Array.from(
    new Set(resolvedItems.map((item) => item.sku_id).filter((id): id is string => Boolean(id))),
  );
  if (candidateSkuIds.length) {
    const { data: existingRows, error: existingError } = await supabase
      .from("ecom_products")
      .select("id")
      .in("id", candidateSkuIds);
    if (existingError) {
      return json({ ok: false, error: "ecom_products_lookup_failed" }, 500);
    }
    const existingIds = new Set(
      (existingRows ?? [])
        .map((row) => String((row as any).id ?? ""))
        .filter((id) => Boolean(id)),
    );
    resolvedItems = resolvedItems.filter((item) => {
      if (!existingIds.has(item.sku_id)) {
        errors.push({ reason: "sku_not_found", item });
        return false;
      }
      return true;
    });
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

  if (!resolvedItems.length) {
    if (runId) {
      await supabase
        .from("supplier_feed_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: "no_valid_items",
          stats: { received: rawItems.length, failed: errors.length },
        })
        .eq("id", runId);
    }
    return json({ ok: false, error: "no_valid_items", runId, details: errors.slice(0, 25) }, 400);
  }

  const now = new Date().toISOString();
  const upsertRows = resolvedItems.map((item) => {
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
    if (item.is_available != null) row.is_available = item.is_available;
    if (item.inventory_status != null) row.inventory_status = item.inventory_status;
    if (item.stock_quantity != null) row.stock_quantity = item.stock_quantity;
    return row;
  });

  const productUpdates = resolvedItems.map((item) => {
    const row: Record<string, unknown> = { id: item.sku_id };
    if (item.is_available != null) row.is_available = item.is_available;
    if (item.inventory_status != null) row.inventory_status = item.inventory_status;
    if (item.stock_quantity != null) row.stock_quantity = item.stock_quantity;
    if (item.price_cents != null) row.price_cents = item.price_cents;
    if (item.currency) row.currency = item.currency;
    return row;
  });

  let missingRows: Array<{ id: string; miss_count: number | null; is_available: boolean | null; inventory_status: string | null }> = [];
  const seenSkuIds = Array.from(new Set(resolvedItems.map((item) => item.sku_id).filter(Boolean)));

  try {
    const { data: upserted, error: upsertError } = await supabase
      .from("supplier_skus")
      .upsert(upsertRows, { onConflict: "supplier_id,sku_id" })
      .select("sku_id");
    if (upsertError) throw upsertError;

    let ecomUpdatedCount = 0;
    for (const updateRow of productUpdates) {
      const { id, ...fields } = updateRow;
      const fieldKeys = Object.keys(fields);
      if (!id || !fieldKeys.length) continue;
      const { error: ecomError } = await supabase.from("ecom_products").update(fields).eq("id", id);
      if (ecomError) throw ecomError;
      ecomUpdatedCount += 1;
    }

    const { data: allRows, error: missingError } = await supabase
      .from("supplier_skus")
      .select("id, miss_count, is_available, inventory_status, sku_id")
      .eq("supplier_id", supplierId);
    if (missingError) throw missingError;
    if (Array.isArray(allRows)) {
      const seenSet = new Set(seenSkuIds);
      missingRows = allRows
        .filter((row) => !seenSet.has(String((row as any).sku_id)))
        .map((row) => ({
          id: String((row as any).id),
          miss_count: typeof (row as any).miss_count === "number" ? (row as any).miss_count : null,
          is_available: typeof (row as any).is_available === "boolean" ? (row as any).is_available : null,
          inventory_status: typeof (row as any).inventory_status === "string" ? (row as any).inventory_status : null,
        }));
    }

    const missUpdates = missingRows.map((row) => {
      const current = typeof row.miss_count === "number" ? row.miss_count : 0;
      const next = current + 1;
      const disable = next >= missThreshold;
      return {
        id: row.id,
        miss_count: next,
        ...(disable ? { is_available: false, inventory_status: "out_of_stock" } : {}),
      };
    });

    if (missUpdates.length) {
      await supabase.from("supplier_skus").upsert(missUpdates, { onConflict: "id" });
    }

    const disabledCount = missUpdates.filter((row) => row.miss_count >= missThreshold).length;

    if (runId) {
      await supabase
        .from("supplier_feed_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          error: errors.length ? "partial_failures" : null,
          stats: {
            received: rawItems.length,
            parsed: resolvedItems.length,
            failed: errors.length,
            upserted: upsertRows.length,
            ecom_updated: ecomUpdatedCount,
            missing: missUpdates.length,
            disabled: disabledCount,
          },
        })
        .eq("id", runId);
    }

    return json({
      ok: true,
      runId,
      stats: {
        received: rawItems.length,
        parsed: resolvedItems.length,
        failed: errors.length,
        upserted: upsertRows.length,
        ecom_updated: ecomUpdatedCount,
        missing: missUpdates.length,
        disabled: disabledCount,
      },
      warnings: errors.slice(0, 25),
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
          stats: { received: rawItems.length, parsed: resolvedItems.length, failed: errors.length },
        })
        .eq("id", runId);
    }
    return json({ ok: false, error: "import_failed", message, runId }, 500);
  }
}
