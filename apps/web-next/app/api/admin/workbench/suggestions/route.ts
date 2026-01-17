import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const UNMAPPED_TABLE = "supplier_feed_unmapped" as any;
const ATTRIBUTE_TABLE = "product_attributes" as any;
const SKU_FIELDS = "id, sku, slug, title, currency, price_cents, status";

const GTIN_KEYS = ["gtin", "ean", "upc", "barcode"];
const MPN_KEYS = ["mpn", "manufacturer_part_number", "mfr_part_number", "part_number"];

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function normalizeDigits(input: string): string {
  return input.replace(/\D+/g, "");
}

function normalizeMpn(input: string): string {
  return input.trim().toUpperCase();
}

function findInPayload(payload: Record<string, unknown> | null, keys: string[]): string | null {
  if (!payload) return null;
  const direct = keys
    .map((key) => payload[key] ?? payload[key.toUpperCase()] ?? payload[key.toLowerCase()])
    .find((value) => typeof value === "string" && value.trim());
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const identifiers = payload.identifiers as Record<string, unknown> | null | undefined;
  if (identifiers && typeof identifiers === "object") {
    const match = keys
      .map((key) => identifiers[key] ?? identifiers[key.toUpperCase()] ?? identifiers[key.toLowerCase()])
      .find((value) => typeof value === "string" && value.trim());
    if (typeof match === "string" && match.trim()) return match.trim();
  }

  const attributes = payload.attributes as Record<string, unknown> | null | undefined;
  if (attributes && typeof attributes === "object") {
    const match = keys
      .map((key) => attributes[key] ?? attributes[key.toUpperCase()] ?? attributes[key.toLowerCase()])
      .find((value) => typeof value === "string" && value.trim());
    if (typeof match === "string" && match.trim()) return match.trim();
  }

  return null;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const supplierId = normalizeString(url.searchParams.get("supplier_id"));
  const vendorSku = normalizeString(url.searchParams.get("vendor_sku"));

  if (!supplierId || !vendorSku) {
    return json({ ok: false, error: "mapping_required" }, 400);
  }

  const supabase = getAdminClient();
  const { data: unmappedRow, error } = await supabase
    .from(UNMAPPED_TABLE)
    .select("id, vendor_sku, sample_payload")
    .eq("supplier_id", supplierId)
    .eq("vendor_sku", vendorSku)
    .maybeSingle();

  if (error) {
    return json({ ok: false, error: "unmapped_fetch_failed", message: error.message }, 500);
  }

  if (!unmappedRow) {
    return json({ ok: false, error: "unmapped_not_found" }, 404);
  }

  const samplePayload = (unmappedRow as any)?.sample_payload as Record<string, unknown> | null;
  const rawGtin = findInPayload(samplePayload, [...GTIN_KEYS, "gtin14", "gtin13", "ean13", "upca", "upc_a"]);
  const rawMpn = findInPayload(samplePayload, [...MPN_KEYS, "manufacturerPartNumber", "mfrPartNumber"]);

  const gtin = rawGtin ? normalizeDigits(rawGtin) : null;
  const mpn = rawMpn ? normalizeMpn(rawMpn) : null;

  const suggestions: Array<{ sku: any; match_types: string[]; match_values: Record<string, string> }> = [];
  const bySkuId = new Map<string, { sku: any; match_types: Set<string>; match_values: Record<string, string> }>();

  const addSuggestion = (row: any, type: "gtin" | "mpn", value: string) => {
    const sku = row?.ecom_products ?? null;
    if (!sku || !sku.id) return;
    const skuId = String(sku.id);
    const existing = bySkuId.get(skuId);
    if (existing) {
      existing.match_types.add(type);
      existing.match_values[type] = value;
      return;
    }
    bySkuId.set(skuId, {
      sku,
      match_types: new Set([type]),
      match_values: { [type]: value },
    });
  };

  if (gtin) {
    const { data: rows } = await supabase
      .from(ATTRIBUTE_TABLE)
      .select(`product_id, key, value, ecom_products(${SKU_FIELDS})`)
      .in("key", GTIN_KEYS)
      .eq("value", gtin)
      .limit(10);

    if (Array.isArray(rows)) {
      rows.forEach((row) => addSuggestion(row, "gtin", gtin));
    }
  }

  if (mpn) {
    const safeMpn = mpn.replace(/[\\%_]/g, (match) => `\\${match}`);
    const { data: rows } = await supabase
      .from(ATTRIBUTE_TABLE)
      .select(`product_id, key, value, ecom_products(${SKU_FIELDS})`)
      .in("key", MPN_KEYS)
      .ilike("value", safeMpn)
      .limit(10);

    if (Array.isArray(rows)) {
      rows.forEach((row) => addSuggestion(row, "mpn", mpn));
    }
  }

  for (const value of bySkuId.values()) {
    suggestions.push({
      sku: value.sku,
      match_types: Array.from(value.match_types),
      match_values: value.match_values,
    });
  }

  return json(
    {
      ok: true,
      identifiers: { gtin, mpn },
      suggestions,
    },
    200,
  );
}
