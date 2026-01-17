import { json } from "@/app/api/orders/utils";

function normalizeString(input: string | null, fallback: string) {
  const value = typeof input === "string" ? input.trim() : "";
  return value || fallback;
}

function normalizeNumber(input: string | null, fallback: number) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(input: string | null, fallback: boolean) {
  if (typeof input !== "string") return fallback;
  const value = input.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(value)) return true;
  if (["false", "0", "no", "n"].includes(value)) return false;
  return fallback;
}

function normalizeCurrency(input: string | null, fallback: string) {
  const value = typeof input === "string" ? input.trim().toUpperCase() : "";
  return value || fallback;
}

function normalizeCount(input: string | null, fallback: number) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const vendorSku = normalizeString(url.searchParams.get("vendor_sku"), "MOCK-001");
  const currency = normalizeCurrency(url.searchParams.get("currency"), "USD");
  const priceCents = normalizeNumber(url.searchParams.get("price_cents"), 1200);
  const stockQuantity = normalizeNumber(url.searchParams.get("stock_quantity"), 5);
  const isAvailable = normalizeBoolean(url.searchParams.get("is_available"), true);
  const gtin = normalizeString(url.searchParams.get("gtin"), "");
  const mpn = normalizeString(url.searchParams.get("mpn"), "");
  const brand = normalizeString(url.searchParams.get("brand"), "");
  const count = normalizeCount(url.searchParams.get("count"), 1);

  const items = Array.from({ length: count }).map((_, index) => {
    const suffix = count > 1 ? `-${index + 1}` : "";
    return {
      vendor_sku: `${vendorSku}${suffix}`,
      price_cents: priceCents,
      currency,
      stock_quantity: stockQuantity,
      is_available: isAvailable,
      inventory_status: isAvailable && stockQuantity > 0 ? "in_stock" : "out_of_stock",
      gtin: gtin || null,
      mpn: mpn || null,
      brand: brand || null,
    };
  });

  return json(items, 200);
}
