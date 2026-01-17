import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const GTIN_KEYS = ["gtin", "ean", "upc", "barcode", "gtin14", "gtin13", "ean13", "upca"];
const MPN_KEYS = ["mpn", "manufacturer_part_number", "mfr_part_number", "part_number"];

const SKU_FIELDS = "id, title, slug, catalog_product_id";
const CATALOG_FIELDS = "id, slug, title, status, brand_id, brands(name, slug)";

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

function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function pickFirst(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
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
  const catalogClient = getAdminClient("catalog");

  const { data: skuRow, error: skuError } = await supabase
    .from("ecom_products")
    .select(SKU_FIELDS)
    .eq("id", skuId)
    .maybeSingle();

  if (skuError) {
    return json({ ok: false, error: "sku_fetch_failed", message: skuError.message }, 500);
  }
  if (!skuRow) {
    return json({ ok: false, error: "sku_not_found" }, 404);
  }

  const { data: attrs, error: attrError } = await supabase
    .from("product_attributes")
    .select("key, value")
    .eq("product_id", skuId)
    .in("key", [...GTIN_KEYS, ...MPN_KEYS, "brand"]);

  if (attrError) {
    return json({ ok: false, error: "attributes_fetch_failed", message: attrError.message }, 500);
  }

  const gtinRaw = pickFirst((attrs ?? []).filter((row: any) => GTIN_KEYS.includes(row.key)).map((row: any) => row.value));
  const mpnRaw = pickFirst((attrs ?? []).filter((row: any) => MPN_KEYS.includes(row.key)).map((row: any) => row.value));
  const brandRaw = pickFirst((attrs ?? []).filter((row: any) => row.key === "brand").map((row: any) => row.value));

  const gtin = gtinRaw ? normalizeDigits(gtinRaw) : null;
  const mpn = mpnRaw ? normalizeMpn(mpnRaw) : null;
  const brand = brandRaw ?? null;

  let catalog: any = null;
  const catalogId = normalizeString((skuRow as any).catalog_product_id);
  if (catalogId) {
    const { data: catalogRow, error: catalogError } = await catalogClient
      .from("products")
      .select(CATALOG_FIELDS)
      .eq("id", catalogId)
      .maybeSingle();
    if (catalogError) {
      return json({ ok: false, error: "catalog_fetch_failed", message: catalogError.message }, 500);
    }
    if (catalogRow) {
      const brandRow = (catalogRow as any).brands;
      catalog = {
        id: catalogRow.id,
        slug: catalogRow.slug,
        title: catalogRow.title,
        status: catalogRow.status,
        brand_id: catalogRow.brand_id ?? null,
        brand_name: brandRow?.name ?? null,
        brand_slug: brandRow?.slug ?? null,
      };
    }
  }

  const suggestionsByCatalog = new Map<
    string,
    { match_types: Set<string>; match_values: Record<string, string> }
  >();

  const addSuggestion = (catalogProductId: string, type: "gtin" | "mpn", value: string) => {
    const existing = suggestionsByCatalog.get(catalogProductId);
    if (existing) {
      existing.match_types.add(type);
      existing.match_values[type] = value;
      return;
    }
    suggestionsByCatalog.set(catalogProductId, {
      match_types: new Set([type]),
      match_values: { [type]: value },
    });
  };

  if (gtin) {
    const { data: rows, error } = await supabase
      .from("product_attributes")
      .select("product_id, key, value, ecom_products(catalog_product_id)")
      .in("key", GTIN_KEYS)
      .eq("value", gtin)
      .limit(20);
    if (error) {
      return json({ ok: false, error: "suggestions_fetch_failed", message: error.message }, 500);
    }
    for (const row of rows ?? []) {
      const catalogProductId = (row as any)?.ecom_products?.catalog_product_id ?? null;
      if (catalogProductId) addSuggestion(String(catalogProductId), "gtin", gtin);
    }
  }

  if (mpn) {
    const safeMpn = escapeIlike(mpn);
    const { data: rows, error } = await supabase
      .from("product_attributes")
      .select("product_id, key, value, ecom_products(catalog_product_id)")
      .in("key", MPN_KEYS)
      .ilike("value", safeMpn)
      .limit(20);
    if (error) {
      return json({ ok: false, error: "suggestions_fetch_failed", message: error.message }, 500);
    }
    for (const row of rows ?? []) {
      const catalogProductId = (row as any)?.ecom_products?.catalog_product_id ?? null;
      if (catalogProductId) addSuggestion(String(catalogProductId), "mpn", mpn);
    }
  }

  const suggestionIds = Array.from(suggestionsByCatalog.keys());
  let suggestions: any[] = [];
  if (suggestionIds.length) {
    const { data: catalogRows, error: catalogError } = await catalogClient
      .from("products")
      .select(CATALOG_FIELDS)
      .in("id", suggestionIds);
    if (catalogError) {
      return json({ ok: false, error: "catalog_fetch_failed", message: catalogError.message }, 500);
    }
    suggestions = (catalogRows ?? []).map((row: any) => {
      const meta = suggestionsByCatalog.get(String(row.id));
      const brandRow = row.brands;
      return {
        catalog_id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        brand_id: row.brand_id ?? null,
        brand_name: brandRow?.name ?? null,
        brand_slug: brandRow?.slug ?? null,
        match_types: meta ? Array.from(meta.match_types) : [],
        match_values: meta?.match_values ?? {},
      };
    });
  }

  return json(
    {
      ok: true,
      sku: {
        id: (skuRow as any).id,
        title: (skuRow as any).title,
        slug: (skuRow as any).slug,
        catalog_product_id: (skuRow as any).catalog_product_id ?? null,
      },
      catalog,
      identifiers: {
        gtin,
        mpn,
        brand,
      },
      suggestions,
    },
    200,
  );
}
