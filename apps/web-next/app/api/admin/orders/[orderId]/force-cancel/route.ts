import { json } from "@/app/api/orders/utils";
import { notifyForceCancel } from "@/app/api/payments/notify";
import { mergeOrderMetadata } from "@/app/api/payments/utils";
import { recordWebhookLog } from "@/app/api/payments/observability";
import { requireAdmin, type AuthUserRecord } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { resetOrdersCache } from "@shared/sdk/ordersClient";

type RouteParams = { params: Promise<{ orderId: string }> };

type ForceCancelPayload = {
  reason?: unknown;
  notify?: unknown;
};

const FINAL_ORDER_STATUSES = new Set(["paid", "succeeded", "refunded", "cancelled", "canceled", "fulfilled"]);
const FINAL_PAYMENT_STATUSES = new Set([
  "succeeded",
  "captured",
  "paid",
  "settled",
  "refunded",
  "partial_refund",
]);

function normalizeReason(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 500);
}

function shouldNotify(input: unknown): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
  }
  return true;
}

export async function POST(request: Request, context: RouteParams) {
  const adminToken = process.env.ADMIN_TOKEN?.trim() ?? "";
  const incomingToken =
    (request.headers.get("x-admin-token") || request.headers.get("X-Admin-Token") || "").trim();

  let actor: AuthUserRecord | null = null;
  if (!adminToken || incomingToken !== adminToken) {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;
    actor = auth.user;
  } else {
    try {
      const auth = await requireAdmin(request);
      if (!("response" in auth)) {
        actor = auth.user;
      }
    } catch {
      // ignore optional auth attempt when using admin token
    }
  }

  const { orderId } = await context.params;
  if (!orderId) {
    return json({ ok: false, code: "bad_request", message: "order_id_required" }, 400);
  }

  let payload: ForceCancelPayload = {};
  try {
    payload = (await request.json()) as ForceCancelPayload;
  } catch {
    // accept empty body
  }

  const reason = normalizeReason(payload.reason) ?? "force_cancelled";
  const notify = shouldNotify(payload.notify);

  const supabase = getAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, user_id, status, payment_status, payment_intent_id, metadata_b, amount_cents, currency")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) {
    return json({ ok: false, code: "db", message: fetchError.message }, 500);
  }
  if (!order) {
    return json({ ok: false, code: "not_found" }, 404);
  }

  const previousStatus = String(order.status ?? "").toLowerCase();
  const previousPaymentStatus = String(order.payment_status ?? "").toLowerCase();

  if (FINAL_ORDER_STATUSES.has(previousStatus) || FINAL_PAYMENT_STATUSES.has(previousPaymentStatus)) {
    return json({ ok: false, code: "conflict", message: "order_already_completed" }, 409);
  }

  const now = new Date().toISOString();
  const metadataPatch = mergeOrderMetadata(order.metadata_b, {
    admin_cancelled: true,
    cancelled_by: actor?.id ?? "admin_token",
    cancelled_reason: reason,
    cancelled_at: now,
    reason,
    previous_status: previousStatus || null,
    previous_payment_status: previousPaymentStatus || null,
  });

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      payment_status: "cancelled",
      cancelled_at: now,
      metadata_b: metadataPatch,
    })
    .eq("id", orderId);

  if (updateError) {
    return json({ ok: false, code: "db", message: updateError.message }, 500);
  }

  const { error: paymentsError } = await supabase
    .from("payments")
    .update({ status: "canceled" })
    .eq("order_id", orderId);

  if (paymentsError) {
    return json({ ok: false, code: "db", message: paymentsError.message }, 500);
  }

  try {
    const { data: historyRow } = await supabase
      .from("order_status_history")
      .select("id, reason, changed_by")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (historyRow?.id) {
      const patch: Record<string, unknown> = {};
      if (!historyRow.reason) patch.reason = reason;
      if (actor?.id && historyRow.changed_by !== actor.id) {
        patch.changed_by = actor.id;
      }
      if (Object.keys(patch).length) {
        await supabase.from("order_status_history").update(patch).eq("id", historyRow.id);
      }
    }
  } catch (error) {
    console.warn("[admin][orders][force-cancel] failed to update history", {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const eventId = `admin.force_cancel:${orderId}:${Date.now()}`;

  try {
    await supabase.from("processed_events").insert({
      event_id: eventId,
      event_type: "admin.force_cancel",
      created_at: now,
    });
  } catch (error) {
    console.warn("[admin][orders][force-cancel] failed to record processed_event", {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  await recordWebhookLog({
    supabase,
    type: "admin.force_cancel",
    status: "info",
    message: reason,
    payload: {
      orderId,
      userId: order.user_id,
      paymentIntentId: order.payment_intent_id,
      previousStatus,
      previousPaymentStatus,
      actorId: actor?.id ?? null,
    },
  });

  if (notify) {
    void notifyForceCancel({
      orderId,
      amountCents: Number(order.amount_cents ?? 0),
      currency: String(order.currency ?? "usd"),
      userId: order.user_id ?? null,
      paymentIntentId: order.payment_intent_id ?? null,
      adminUserId: actor?.id ?? null,
      reason,
      eventId,
    });
  }

  resetOrdersCache();

  return json({
    ok: true,
    admin_cancelled: true,
    order_id: orderId,
    cancelled_at: now,
  });
}
