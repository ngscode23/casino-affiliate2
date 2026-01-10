import { json } from "../../utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { getOrdersClient } from "@shared/sdk/ordersClient";

type Payload = {
  reason?: string;
  note?: string;
  metadata?: Record<string, unknown>;
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
  const note = normalizeText(payload.note, 1000);
  const metadata = (payload.metadata as Record<string, unknown>) ?? {};

  const { data, error } = await supabase
    .from("rma_requests")
    .upsert(
      {
        order_id: orderId,
        user_id: user.id,
        status: "pending",
        reason,
        note,
        metadata,
      },
      { onConflict: "order_id" },
    )
    .select("*")
    .maybeSingle();

  if (error) return json({ ok: false, code: "create_failed", message: error.message }, 500);
  return json({ ok: true, item: data }, 200);
}
