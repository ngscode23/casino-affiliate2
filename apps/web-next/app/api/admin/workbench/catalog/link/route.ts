import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

type LinkPayload = {
  sku_id?: string;
  catalog_product_id?: string;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: LinkPayload;
  try {
    payload = (await request.json()) as LinkPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const skuId = normalizeString(payload.sku_id);
  const catalogId = normalizeString(payload.catalog_product_id);
  if (!skuId || !catalogId) {
    return json({ ok: false, error: "sku_and_catalog_required" }, 400);
  }

  const supabase = getAdminClient();
  const catalogClient = getAdminClient("catalog");

  const { data: skuRow, error: skuError } = await supabase
    .from("ecom_products")
    .select("id, catalog_product_id")
    .eq("id", skuId)
    .maybeSingle();
  if (skuError) {
    return json({ ok: false, error: "sku_fetch_failed", message: skuError.message }, 500);
  }
  if (!skuRow) {
    return json({ ok: false, error: "sku_not_found" }, 404);
  }

  const { data: catalogRow, error: catalogError } = await catalogClient
    .from("products")
    .select("id")
    .eq("id", catalogId)
    .maybeSingle();
  if (catalogError) {
    return json({ ok: false, error: "catalog_fetch_failed", message: catalogError.message }, 500);
  }
  if (!catalogRow) {
    return json({ ok: false, error: "catalog_not_found" }, 404);
  }

  const { error: updateError } = await supabase
    .from("ecom_products")
    .update({ catalog_product_id: catalogId })
    .eq("id", skuId);

  if (updateError) {
    return json({ ok: false, error: "link_failed", message: updateError.message }, 500);
  }

  return json({ ok: true, catalog_product_id: catalogId }, 200);
}
