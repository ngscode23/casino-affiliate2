import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

type QueueStatus = "pending" | "matched" | "created" | "conflict" | "error" | "done";

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const supplierId = normalizeString(url.searchParams.get("supplier_id"));
  const statusParam = normalizeString(url.searchParams.get("status"));
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 200)) : 50;

  const allowedStatuses = new Set<QueueStatus>(["pending", "matched", "created", "conflict", "error", "done"]);
  const status = allowedStatuses.has(statusParam as QueueStatus) ? (statusParam as QueueStatus) : null;

  const supabase = getAdminClient();
  let query = supabase
    .from("automation_queue")
    .select(
      "id, supplier_id, vendor_sku, status, reason, sku_id, candidate_skus, payload_snapshot, created_at, updated_at, suppliers(name, code)",
    )
    .order("created_at", { ascending: true })
    .limit(limit);

  if (supplierId) query = query.eq("supplier_id", supplierId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return json({ ok: false, error: "queue_fetch_failed", message: error.message }, 500);
  }

  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    supplier_id: row.supplier_id,
    supplier_name: row.suppliers?.name ?? null,
    supplier_code: row.suppliers?.code ?? null,
    vendor_sku: row.vendor_sku,
    status: row.status,
    reason: row.reason,
    sku_id: row.sku_id,
    candidate_skus: row.candidate_skus ?? [],
    payload_snapshot: row.payload_snapshot ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return json({ ok: true, items }, 200);
}
