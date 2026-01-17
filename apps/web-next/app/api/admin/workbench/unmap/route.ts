import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

type UnmapPayload = {
  id?: string;
  supplier_id?: string;
  sku_id?: string;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: UnmapPayload;
  try {
    payload = (await request.json()) as UnmapPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  const supplierId = normalizeString(payload.supplier_id);
  const skuId = normalizeString(payload.sku_id);

  if (!id && (!supplierId || !skuId)) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const supabase = getAdminClient();
  let query = supabase.from("supplier_skus").delete();
  if (id) {
    query = query.eq("id", id);
  } else {
    query = query.eq("supplier_id", supplierId).eq("sku_id", skuId);
  }

  const { data, error } = await query.select("id, supplier_id, sku_id, supplier_sku").maybeSingle();
  if (error) {
    return json({ ok: false, error: "delete_failed", message: error.message }, 500);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}
