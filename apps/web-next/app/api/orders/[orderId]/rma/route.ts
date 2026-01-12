import { json } from "../../utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { getOrdersClient } from "@shared/sdk/ordersClient";

type Payload = {
  reason?: string;
  notes?: string;
};

function normalizeText(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const { orderId } = await context.params;
  if (!orderId) return json({ ok: false, code: "order_id_required" }, 400);

  const supabase = getAdminClient();
  const ordersClient = getOrdersClient({ supabase });

  const detail = await ordersClient.getOrderDetails(orderId, user.id);
  if (!detail) return json({ ok: false, code: "not_found" }, 404);

  const { data, error } = await supabase
    .from("rma_requests")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) return json({ ok: false, code: "db_error", message: error.message }, 500);
  return json({ ok: true, item: data ?? null }, 200);
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const { orderId } = await context.params;
  if (!orderId) return json({ ok: false, code: "order_id_required" }, 400);

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return json({ ok: false, code: "bad_json" }, 400);
  }

  const supabase = getAdminClient();
  const ordersClient = getOrdersClient({ supabase });
  const detail = await ordersClient.getOrderDetails(orderId, user.id);
  if (!detail) return json({ ok: false, code: "not_found" }, 404);

  const reason = normalizeText(payload.reason, 240);
  const notes = normalizeText(payload.notes, 2000);

  // rma_requests schema (per remote types): { order_id, status, reason, notes, ... }
  // No unique constraint on order_id in DB, so don't use onConflict upsert.
  const { data: existing, error: existingError } = await supabase
    .from("rma_requests")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingError) return json({ ok: false, code: "db_error", message: existingError.message }, 500);

  if (existing?.id) {
    const updates: Record<string, unknown> = {};
    if ("reason" in payload) updates.reason = reason;
    if ("notes" in payload) updates.notes = notes;

    if (!Object.keys(updates).length) {
      return json({ ok: true, item: existing }, 200);
    }

    const { data: updated, error: updateError } = await supabase
      .from("rma_requests")
      .update(updates)
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();

    if (updateError) return json({ ok: false, code: "update_failed", message: updateError.message }, 500);
    return json({ ok: true, item: updated ?? existing }, 200);
  }

  const { data, error } = await supabase
    .from("rma_requests")
    .insert({
      order_id: orderId,
      status: "requested",
      reason,
      notes,
    })
    .select("*")
    .maybeSingle();

  if (error) return json({ ok: false, code: "create_failed", message: error.message }, 500);
  return json({ ok: true, item: data }, 200);
}
