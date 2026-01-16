import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const ALLOWED_STATUSES = new Set(["pending", "in_transit", "delivered", "exception", "returned"]);

function normalizeString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  return value || null;
}

function normalizeStatus(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (!value) return null;
  return ALLOWED_STATUSES.has(value) ? value : null;
}

function normalizeDate(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

type ShipmentPayload = {
  id?: string;
  order_id?: string;
  purchase_order_id?: string | null;
  status?: string;
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  eta?: string | null;
  last_event_at?: string | null;
  notification_email?: string | null;
};

function shouldNotifyTrackingUpdate(prevStatus: string | null, nextStatus: string | null, isInsert: boolean): boolean {
  const next = (nextStatus ?? "").trim().toLowerCase();
  if (!next) return false;
  if (next === "pending") return false;

  if (isInsert) return true;

  const prev = (prevStatus ?? "").trim().toLowerCase();
  return prev !== next;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const status = normalizeStatus(url.searchParams.get("status"));
  const orderId = normalizeString(url.searchParams.get("order_id"));
  const poId = normalizeString(url.searchParams.get("purchase_order_id"));
  const tracking = normalizeString(url.searchParams.get("tracking_number"));
  const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 500);

  const supabase = getAdminClient();
  let query = supabase
    .from("shipments")
    .select(
      "id, order_id, purchase_order_id, status, carrier, tracking_number, tracking_url, shipped_at, delivered_at, eta, last_event_at, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (orderId) query = query.eq("order_id", orderId);
  if (poId) query = query.eq("purchase_order_id", poId);
  if (tracking) query = query.ilike("tracking_number", `%${tracking}%`);

  const { data, error } = await query;
  if (error) return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  return json({ ok: true, items: data ?? [] }, 200);
}

async function upsertShipment(payload: ShipmentPayload) {
  const supabase = getAdminClient();
  const orderId = normalizeString(payload.order_id);
  if (!orderId) {
    return { error: "order_id_required", status: 400 };
  }

  const purchaseOrderId = normalizeString(payload.purchase_order_id ?? null);
  if (!purchaseOrderId) {
    return { error: "purchase_order_id_required", status: 400 };
  }

  const record: Record<string, unknown> = {
    order_id: orderId,
    purchase_order_id: purchaseOrderId,
    status: normalizeStatus(payload.status) ?? "pending",
    carrier: normalizeString(payload.carrier ?? null),
    tracking_number: normalizeString(payload.tracking_number ?? null),
    tracking_url: normalizeString(payload.tracking_url ?? null),
    shipped_at: normalizeDate(payload.shipped_at ?? null),
    delivered_at: normalizeDate(payload.delivered_at ?? null),
    eta: normalizeDate(payload.eta ?? null),
    last_event_at: normalizeDate(payload.last_event_at ?? null),
    notification_email: normalizeString(payload.notification_email ?? null),
  };
  payloadNotificationEmailRef.value = record.notification_email as string | null;

  const existingId = normalizeString(payload.id ?? null);
  if (existingId) {
    const { data: prev } = await supabase
      .from("shipments")
      .select("status")
      .eq("id", existingId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("shipments")
      .update(record)
      .eq("id", existingId)
      .select("*")
      .maybeSingle();
    if (error) return { error: error.message, status: 500 };

    const shouldNotify = shouldNotifyTrackingUpdate(
      ((prev as any)?.status as string | null) ?? null,
      (record.status as string | null) ?? null,
      false,
    );
    const emailResult = shouldNotify
      ? await enqueueTrackingEmail(
          orderId,
          record.tracking_number as string | null,
          record.tracking_url as string | null,
          record.status as string | null,
          record.carrier as string | null,
          record.eta as string | null,
        )
      : { enqueued: false, reason: "status_unchanged_or_pending" };
    await updatePurchaseOrderStatus(purchaseOrderId, record.status as string, record.shipped_at as string | null);
    return { data, outbox: emailResult };
  }

  const trackingNumber = normalizeString(payload.tracking_number ?? null);
  if (trackingNumber) {
    const { data: existing } = await supabase
      .from("shipments")
      .select("id, status")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();
    if (existing?.id) {
      const { data, error } = await supabase
        .from("shipments")
        .update(record)
        .eq("id", existing.id)
        .select("*")
        .maybeSingle();
      if (error) return { error: error.message, status: 500 };

      const shouldNotify = shouldNotifyTrackingUpdate(
        ((existing as any)?.status as string | null) ?? null,
        (record.status as string | null) ?? null,
        false,
      );
      const emailResult = shouldNotify
        ? await enqueueTrackingEmail(
            orderId,
            record.tracking_number as string | null,
            record.tracking_url as string | null,
            record.status as string | null,
            record.carrier as string | null,
            record.eta as string | null,
          )
        : { enqueued: false, reason: "status_unchanged_or_pending" };
      await updatePurchaseOrderStatus(purchaseOrderId, record.status as string, record.shipped_at as string | null);
      return { data, outbox: emailResult };
    }
  }

  const { data, error } = await supabase.from("shipments").insert(record).select("*").maybeSingle();
  if (error) return { error: error.message, status: 500 };
  const shouldNotify = shouldNotifyTrackingUpdate(null, (record.status as string | null) ?? null, true);
  const emailResult = shouldNotify
    ? await enqueueTrackingEmail(
        orderId,
        record.tracking_number as string | null,
        record.tracking_url as string | null,
        record.status as string | null,
        record.carrier as string | null,
        record.eta as string | null,
      )
    : { enqueued: false, reason: "status_unchanged_or_pending" };
  await updatePurchaseOrderStatus(purchaseOrderId, record.status as string, record.shipped_at as string | null);
  return { data, outbox: emailResult };
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: ShipmentPayload;
  try {
    payload = (await request.json()) as ShipmentPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const result = await upsertShipment(payload);
  if ("error" in result && result.error) {
    return json({ ok: false, error: result.error }, result.status ?? 500);
  }

  return json({ ok: true, item: result.data, outbox: (result as any).outbox ?? null }, 200);
}

export async function PUT(request: Request) {
  return POST(request);
}

async function updatePurchaseOrderStatus(
  purchaseOrderId: string,
  shipmentStatus: string | null,
  shippedAt: string | null,
) {
  if (!shipmentStatus) return;
  // Map shipment status to existing po_status enum values
  const statusMap: Record<string, string> = {
    in_transit: "shipped",
    delivered: "shipped",
    exception: "failed",
    returned: "cancelled",
  };
  const nextStatus = statusMap[shipmentStatus];
  if (!nextStatus) return;

  const updates: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "shipped" && shippedAt) updates.shipped_at = shippedAt;
  if (nextStatus === "failed") updates.error_message = "Shipment exception";
  if (nextStatus === "cancelled") updates.cancelled_at = new Date().toISOString();

  try {
    await getAdminClient().from("purchase_orders").update(updates).eq("id", purchaseOrderId);
  } catch {
    // fail-soft: don't block shipment creation
  }
}

async function enqueueTrackingEmail(
  orderId: string,
  trackingNumber: string | null,
  trackingUrl: string | null,
  status: string | null,
  carrier: string | null,
  eta: string | null,
) {
  if (!trackingNumber) return { enqueued: false, reason: "no_tracking_number" };
  try {
    const supabase = getAdminClient();
    const { data } = await supabase
      .from("orders")
      .select("user_id, contact_email, checkout_metadata")
      .eq("id", orderId)
      .maybeSingle();
    const toEmailRaw = (data as any)?.contact_email as string | null;
    const checkoutEmail = (() => {
      const meta = (data as any)?.checkout_metadata as any;
      if (!meta || typeof meta !== "object") return null;
      const rawTop = meta?.contact_email;
      if (typeof rawTop === "string") {
        const trimmed = rawTop.trim();
        if (trimmed) return trimmed;
      }
      const rawNested = meta?.contact?.email;
      if (typeof rawNested !== "string") return null;
      const trimmed = rawNested.trim();
      return trimmed ? trimmed : null;
    })();
    const userId = (data as any)?.user_id as string | null;

    let toEmail = toEmailRaw || checkoutEmail;
    if (!toEmail && userId) {
      const { data: userRow } = await getAdminClient("auth").from("users").select("email").eq("id", userId).maybeSingle();
      toEmail = (userRow as any)?.email ?? null;
    }
    // allow explicit override from payload
    if (!toEmail && typeof (payloadNotificationEmailRef as any)?.value === "string") {
      const v = (payloadNotificationEmailRef as any).value.trim();
      if (v) toEmail = v;
    }
    if (!toEmail) return { enqueued: false, reason: "no_email" };

    await supabase.from("email_outbox").insert({
      type: "tracking_update",
      user_id: userId,
      order_id: orderId,
      to_email: toEmail,
      payload: {
        order_id: orderId,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        status,
        carrier,
        eta,
      },
      status: "pending",
      scheduled_at: new Date().toISOString(),
    });
    return { enqueued: true };
  } catch (err) {
    console.error("[shipments] enqueue tracking email failed", err);
    return { enqueued: false, reason: "enqueue_failed" };
  }
}

// hack: capture last payload notification_email in module scope for enqueueTrackingEmail fallback
const payloadNotificationEmailRef: { value?: string | null } = {};
