export type SupplierFeedRawItem = Record<string, unknown>;

export type SupplierFeedNormalizedItem = {
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

function toPriceCents(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value);
}

function toMinorUnits(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function deriveInventoryStatus(
  isAvailable: boolean | null,
  stockQuantity: number | null,
  rawStatus: string | null,
): string | null {
  if (rawStatus) return rawStatus;
  if (isAvailable === false) return "out_of_stock";
  if (typeof stockQuantity === "number" && stockQuantity <= 0) return "out_of_stock";
  if (isAvailable === true) return "in_stock";
  return null;
}

function deriveIsAvailable(
  isAvailable: boolean | null,
  stockQuantity: number | null,
  inventoryStatus: string | null,
): boolean | null {
  if (typeof isAvailable === "boolean") return isAvailable;
  if (typeof stockQuantity === "number") return stockQuantity > 0;
  if (inventoryStatus === "out_of_stock" || inventoryStatus === "unavailable" || inventoryStatus === "sold_out") {
    return false;
  }
  if (inventoryStatus === "in_stock") return true;
  return null;
}

export function normalizeSupplierFeedItem(raw: SupplierFeedRawItem): SupplierFeedNormalizedItem | null {
  const sku_id = normalizeString(raw.sku_id ?? raw.skuId ?? raw["sku-id"] ?? raw.internal_sku_id ?? "");
  const supplier_sku = normalizeString(
    raw.supplier_sku ?? raw.vendor_sku ?? raw.supplierSku ?? raw.article ?? raw.sku ?? "",
  );
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

export function normalizeSupplierFeedItems(rawItems: SupplierFeedRawItem[]): SupplierFeedNormalizedItem[] {
  return rawItems
    .map((item) => normalizeSupplierFeedItem(item))
    .filter((item): item is SupplierFeedNormalizedItem => Boolean(item));
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

function parseCsvRows(rows: string[][]): SupplierFeedRawItem[] {
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
      sku_id: readValue(row, headerMap, ["sku_id", "skuid", "internal_sku_id"]) ?? undefined,
      supplier_sku:
        readValue(row, headerMap, ["supplier_sku", "vendor_sku", "article", "sku", "supplier_sku_id"]) ?? undefined,
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

export function parseSupplierFeedCsv(text: string): SupplierFeedRawItem[] {
  return parseCsvRows(parseCsv(text));
}

export async function fetchRemoteSupplierFeed(apiUrl: string): Promise<SupplierFeedRawItem[]> {
  const res = await fetch(apiUrl, { method: "GET" });
  if (!res.ok) throw new Error(`Remote feed error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? (data as SupplierFeedRawItem[]) : [];
}
