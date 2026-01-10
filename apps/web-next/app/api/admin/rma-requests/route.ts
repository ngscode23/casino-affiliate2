import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  // Enum rma_status: requested, approved, received, refunded, rejected
  if (["requested", "approved", "received", "refunded", "rejected"].includes(normalized)) return normalized;
  return null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const status = normalizeStatus(url.searchParams.get("status"));
  const orderId = normalizeString(url.searchParams.get("order_id"));
  const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 500);

  const supabase = getAdminClient();
  let query = supabase
    .from("rma_requests")
    .select("id, order_id, status, reason, notes, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (orderId) query = query.eq("order_id", orderId);

  const { data, error } = await query;
  if (error) return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  return json({ ok: true, items: data ?? [] }, 200);
}
