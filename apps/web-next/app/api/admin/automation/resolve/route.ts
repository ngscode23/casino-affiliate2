import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

type ResolvePayload = {
  id?: string;
  sku_id?: string;
  action?: "link" | "skip";
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

async function findVendorSkuConflict(params: {
  supabase: ReturnType<typeof getAdminClient>;
  supplierId: string;
  vendorSku: string;
}) {
  const { supabase, supplierId, vendorSku } = params;
  const { data } = await supabase
    .from("supplier_skus")
    .select("id, sku_id, supplier_sku")
    .eq("supplier_id", supplierId)
    .eq("supplier_sku", vendorSku)
    .maybeSingle();
  return data as { id: string; sku_id: string; supplier_sku: string } | null;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: ResolvePayload;
  try {
    payload = (await request.json()) as ResolvePayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  const skuId = normalizeString(payload.sku_id);
  const action = payload.action === "skip" ? "skip" : "link";

  if (!id) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const supabase = getAdminClient();
  const { data: queueRow, error: queueError } = await supabase
    .from("automation_queue")
    .select("id, supplier_id, vendor_sku, status")
    .eq("id", id)
    .maybeSingle();
  if (queueError) {
    return json({ ok: false, error: "queue_fetch_failed", message: queueError.message }, 500);
  }
  if (!queueRow) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  if (action === "skip") {
    const { error: updateError } = await supabase
      .from("automation_queue")
      .update({ status: "done", reason: "skipped", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) {
      return json({ ok: false, error: "update_failed", message: updateError.message }, 500);
    }
    return json({ ok: true, status: "done" }, 200);
  }

  if (!skuId) {
    return json({ ok: false, error: "sku_id_required" }, 400);
  }

  const supplierId = normalizeString((queueRow as any).supplier_id);
  const vendorSku = normalizeString((queueRow as any).vendor_sku);

  const existing = await findVendorSkuConflict({ supabase, supplierId, vendorSku });
  if (existing?.sku_id && existing.sku_id !== skuId) {
    return json(
      {
        ok: false,
        error: "vendor_sku_already_mapped",
        message: "Vendor SKU already mapped for this supplier.",
        sku_id: existing.sku_id,
        mapping_id: existing.id,
      },
      409,
    );
  }

  const { error: mapError } = await supabase.from("supplier_skus").upsert(
    {
      supplier_id: supplierId,
      sku_id: skuId,
      supplier_sku: vendorSku,
    },
    { onConflict: "supplier_id,sku_id" },
  );

  if (mapError) {
    const status = mapError.code === "23505" ? 409 : 500;
    const errorCode = mapError.code === "23505" ? "vendor_sku_already_mapped" : "mapping_failed";
    return json({ ok: false, error: errorCode, message: mapError.message }, status);
  }

  const { error: updateError } = await supabase
    .from("automation_queue")
    .update({ status: "done", reason: "resolved", sku_id: skuId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) {
    return json({ ok: false, error: "update_failed", message: updateError.message }, 500);
  }

  return json({ ok: true, status: "done", sku_id: skuId }, 200);
}
