import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const ATTRIBUTE_REGISTRY = "attributes_registry" as any;

type AttributePayload = {
  sku_id?: string;
  product_id?: string;
  gtin?: string | null;
  mpn?: string | null;
  brand?: string | null;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function normalizeGtin(input: unknown): string | null {
  const raw = normalizeString(input);
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  return digits || null;
}

function normalizeMpn(input: unknown): string | null {
  const raw = normalizeString(input);
  if (!raw) return null;
  return raw.toUpperCase();
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: AttributePayload;
  try {
    payload = (await request.json()) as AttributePayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const skuId = normalizeString(payload.sku_id ?? payload.product_id ?? "");
  if (!skuId) {
    return json({ ok: false, error: "sku_id_required" }, 400);
  }

  const gtin = normalizeGtin(payload.gtin);
  const mpn = normalizeMpn(payload.mpn);
  const brand = normalizeString(payload.brand);

  const rows: Array<{ product_id: string; key: string; value: string }> = [];
  if (gtin) rows.push({ product_id: skuId, key: "gtin", value: gtin });
  if (mpn) rows.push({ product_id: skuId, key: "mpn", value: mpn });
  if (brand) rows.push({ product_id: skuId, key: "brand", value: brand });

  if (!rows.length) {
    return json({ ok: false, error: "no_attributes" }, 400);
  }

  const supabase = getAdminClient();
  const registryRows = rows.map((row) => ({
    key: row.key,
    type: "text",
    description:
      row.key === "gtin"
        ? "Global Trade Item Number"
        : row.key === "mpn"
          ? "Manufacturer Part Number"
          : row.key === "brand"
            ? "Brand name"
            : null,
  }));
  const { error: registryError } = await supabase
    .from(ATTRIBUTE_REGISTRY)
    .upsert(registryRows, { onConflict: "key" });
  if (registryError) {
    return json({ ok: false, error: "registry_upsert_failed", message: registryError.message }, 500);
  }
  const keys = rows.map((row) => row.key);

  const { error: deleteError } = await supabase
    .from("product_attributes")
    .delete()
    .eq("product_id", skuId)
    .in("key", keys);

  if (deleteError) {
    return json({ ok: false, error: "delete_failed", message: deleteError.message }, 500);
  }

  const { data, error } = await supabase
    .from("product_attributes")
    .insert(rows)
    .select("product_id, key, value");
  if (error) {
    return json({ ok: false, error: "insert_failed", message: error.message }, 500);
  }

  return json({ ok: true, items: data ?? [] }, 200);
}
