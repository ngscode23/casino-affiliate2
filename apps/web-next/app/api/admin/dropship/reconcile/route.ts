import { NextRequest } from "next/server";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { requireCronSecret } from "@/utils/cron/guard";
import { recordWebhookLog } from "@/app/api/payments/observability";
import { createPurchaseOrderForPaidOrder } from "@/lib/workflows/purchase-orders";

type ReconcileRequest = {
  limit?: number;
  lookback_hours?: number;
  min_paid_age_minutes?: number;
  po_pending_stale_hours?: number;
  po_failed_alert_hours?: number;
};

function parseNumber(value: unknown, fallback: number): number {
  const num = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(num) ? num : fallback;
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursAgo(hours: number): string {
  const ms = Math.max(0, hours) * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

function minutesAgo(minutes: number): string {
  const ms = Math.max(0, minutes) * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

function shouldSendOpsAlert(lastAlertIso: unknown, minHoursBetween: number): boolean {
  const last = parseIsoDate(lastAlertIso);
  if (!last) return true;
  const minMs = Math.max(0, minHoursBetween) * 60 * 60 * 1000;
  return Date.now() - last.getTime() >= minMs;
}

async function maybeSendOpsAlert(params: {
  supabase: ReturnType<typeof getAdminClient>;
  toEmail: string | null;
  subject: string;
  payload: Record<string, unknown>;
}): Promise<boolean> {
  const { supabase, toEmail, subject, payload } = params;
  if (!toEmail) return false;

  try {
    await supabase.from("email_outbox").insert({
      type: "ops_alert",
      user_id: null,
      order_id: payload.order_id ?? null,
      to_email: toEmail,
      payload: {
        subject,
        ...payload,
      },
      status: "pending",
      scheduled_at: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    await recordWebhookLog({
      supabase,
      type: "dropship.reconcile.alert_enqueue_failed",
      status: "error",
      message: "Failed to enqueue ops alert email",
      payload: { subject },
      error,
    });
    return false;
  }
}

export async function POST(request: NextRequest) {
  // allow admin or cron secret
  const hasCronHeader = Boolean(request.headers.get("x-cron-secret"));
  if (hasCronHeader) {
    const cronAuth = requireCronSecret(request);
    if (!cronAuth.ok) return json({ ok: false, error: cronAuth.error }, cronAuth.status);
  } else {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;
  }

  let body: ReconcileRequest = {};
  try {
    body = (await request.json()) as ReconcileRequest;
  } catch {
    body = {};
  }

  const supabase = getAdminClient();
  const runId = `reconcile:${new Date().toISOString()}`;

  const limit = Math.min(parseNumber(body.limit, 10), 50);
  const lookbackHours = Math.min(parseNumber(body.lookback_hours, 72), 24 * 30);
  const minPaidAgeMinutes = Math.min(parseNumber(body.min_paid_age_minutes, 5), 120);
  const poPendingStaleHours = Math.min(parseNumber(body.po_pending_stale_hours, 24), 24 * 30);
  const poFailedAlertHours = Math.min(parseNumber(body.po_failed_alert_hours, 1), 24 * 30);

  const opsEmail =
    (process.env.OPS_ALERT_EMAIL || process.env.ADMIN_ALERT_EMAIL || "").trim() || null;

  const paidSinceIso = hoursAgo(lookbackHours);
  const paidBeforeIso = minutesAgo(minPaidAgeMinutes);

  const { data: paidOrders, error: paidError } = await supabase
    .from("orders")
    .select("id, currency, paid_at")
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .gte("paid_at", paidSinceIso)
    .lte("paid_at", paidBeforeIso)
    .order("paid_at", { ascending: true })
    .limit(200);

  if (paidError) {
    await recordWebhookLog({
      supabase,
      type: "dropship.reconcile.fetch_paid_orders_failed",
      status: "error",
      message: paidError.message,
      payload: { paidSinceIso, paidBeforeIso },
      error: paidError,
    });
    return json({ ok: false, error: "fetch_paid_orders_failed", message: paidError.message }, 500);
  }

  const orderRows = (paidOrders ?? []) as Array<{ id: string; currency: string | null; paid_at: string | null }>;
  const orderIds = Array.from(new Set(orderRows.map((row) => row.id)));

  const { data: existingPos } = await supabase
    .from("purchase_orders")
    .select("order_id")
    .in("order_id", orderIds);

  const orderIdsWithPo = new Set<string>((existingPos ?? []).map((row: any) => String(row.order_id ?? "")));
  const missingPoOrders = orderRows.filter((row) => !orderIdsWithPo.has(row.id));
  const targets = missingPoOrders.slice(0, limit);

  let created = 0;
  let attempted = 0;
  const processedOrderIds: string[] = [];

  for (const row of targets) {
    attempted += 1;
    processedOrderIds.push(row.id);
    try {
      await createPurchaseOrderForPaidOrder({
        supabase,
        orderId: row.id,
        eventId: runId,
        orderCurrency: row.currency ?? null,
      });
      created += 1;
    } catch (error) {
      await recordWebhookLog({
        supabase,
        type: "dropship.reconcile.po_create_failed",
        status: "error",
        eventId: runId,
        message: "createPurchaseOrderForPaidOrder failed",
        payload: { orderId: row.id },
        error,
      });
    }
  }

  // Also surface stale POs for ops (optional alert via email_outbox)
  const poPendingOlderThanIso = hoursAgo(poPendingStaleHours);
  const poFailedOlderThanIso = hoursAgo(poFailedAlertHours);

  const [stalePendingRes, staleFailedRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("id, order_id, supplier_id, status, created_at, error_message, metadata")
      .eq("status", "pending")
      .lte("created_at", poPendingOlderThanIso)
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("purchase_orders")
      .select("id, order_id, supplier_id, status, created_at, error_message, metadata")
      .eq("status", "failed")
      .lte("created_at", poFailedOlderThanIso)
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  if (stalePendingRes.error) {
    await recordWebhookLog({
      supabase,
      type: "dropship.reconcile.fetch_stale_pending_pos_failed",
      status: "error",
      eventId: runId,
      message: stalePendingRes.error.message,
      error: stalePendingRes.error,
    });
  }

  if (staleFailedRes.error) {
    await recordWebhookLog({
      supabase,
      type: "dropship.reconcile.fetch_stale_failed_pos_failed",
      status: "error",
      eventId: runId,
      message: staleFailedRes.error.message,
      error: staleFailedRes.error,
    });
  }

  let opsAlertsQueued = 0;
  const merged = [...(stalePendingRes.data ?? []), ...(staleFailedRes.data ?? [])] as any[];
  const byId = new Map<string, any>();
  for (const row of merged) {
    if (!row?.id) continue;
    byId.set(String(row.id), row);
  }
  const staleRows = Array.from(byId.values()).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

  for (const po of staleRows) {
    const status = String(po.status ?? "");
    const createdAt = String(po.created_at ?? "");
    if (!status || !createdAt) continue;

    const meta = po.metadata && typeof po.metadata === "object" ? po.metadata : {};
    const lastAlert = (meta as any)?.ops_alerted_at;
    const canAlert = shouldSendOpsAlert(lastAlert, 6);

    await recordWebhookLog({
      supabase,
      type: "dropship.reconcile.po_stale",
      status: "warning",
      eventId: runId,
      message: "Purchase order requires manual attention",
      payload: {
        purchaseOrderId: po.id,
        orderId: po.order_id,
        supplierId: po.supplier_id,
        status,
        created_at: createdAt,
        error_message: po.error_message ?? null,
      },
    });

    if (opsEmail && canAlert) {
      const queued = await maybeSendOpsAlert({
        supabase,
        toEmail: opsEmail,
        subject: `Dropship PO needs attention: ${status}`,
        payload: {
          purchase_order_id: po.id,
          order_id: po.order_id,
          supplier_id: po.supplier_id,
          status,
          created_at: createdAt,
          error_message: po.error_message ?? null,
          run_id: runId,
        },
      });
      if (queued) {
        opsAlertsQueued += 1;
        try {
          await supabase
            .from("purchase_orders")
            .update({
              metadata: {
                ...(meta as any),
                ops_alerted_at: new Date().toISOString(),
              },
            })
            .eq("id", po.id);
        } catch {
          // fail-soft
        }
      }
    }
  }

  return json(
    {
      ok: true,
      run_id: runId,
      paid_orders_checked: orderRows.length,
      paid_orders_missing_po: missingPoOrders.length,
      attempted,
      created,
      processed_order_ids: processedOrderIds,
      po_stale_checked: staleRows.length,
      ops_alerts_queued: opsAlertsQueued,
      config: {
        limit,
        lookback_hours: lookbackHours,
        min_paid_age_minutes: minPaidAgeMinutes,
        po_pending_stale_hours: poPendingStaleHours,
        po_failed_alert_hours: poFailedAlertHours,
        ops_alert_email_set: Boolean(opsEmail),
      },
    },
    200
  );
}
