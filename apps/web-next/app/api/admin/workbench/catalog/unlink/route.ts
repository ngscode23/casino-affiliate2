import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

type UnlinkPayload = {
  sku_id?: string;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: UnlinkPayload;
  try {
    payload = (await request.json()) as UnlinkPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const skuId = normalizeString(payload.sku_id);
  if (!skuId) {
    return json({ ok: false, error: "sku_id_required" }, 400);
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("ecom_products")
    .update({ catalog_product_id: null })
    .eq("id", skuId)
    .select("id")
    .maybeSingle();
  if (error) {
    return json({ ok: false, error: "unlink_failed", message: error.message }, 500);
  }
  if (!data) {
    return json({ ok: false, error: "sku_not_found" }, 404);
  }

  return json({ ok: true, catalog_product_id: null }, 200);
}
