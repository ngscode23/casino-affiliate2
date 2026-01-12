import { json as jsonResponse } from "../../orders/utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  ensureStripe,
  mapPaymentStatus,
  normalizeCurrency,
  resolveOrderAmount,
  upsertPaymentRecord,
  updateOrderPaymentState,
  type OrderRow,
} from "../utils";
import type Stripe from "stripe";
import { resetOrdersCache } from "@shared/sdk/ordersClient";

const ORDER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  if (status < 400) {
    resetOrdersCache();
  }
  return jsonResponse(body, status);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSkuId(value: unknown): string | null {
  const trimmed = normalizeText(value);
  return ORDER_ID_RE.test(trimmed) ? trimmed : null;
}

function normalizeStatus(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

type FulfillmentCheckFailure =
  | { ok: false; code: "order_has_no_items" }
  | { ok: false; code: "missing_supplier_skus"; sku_ids: string[] }
  | { ok: false; code: "oos_or_unavailable"; sku_ids: string[] };

type FulfillmentCheckResult = { ok: true } | FulfillmentCheckFailure;

function isSupplierSkuAvailable(row: any): boolean {
  if (row?.is_available === false) return false;
  const inv = normalizeStatus(row?.inventory_status);
  if (inv === "out_of_stock") return false;
  const stock = typeof row?.stock_quantity === "number" ? Number(row.stock_quantity) : null;
  if (stock != null && Number.isFinite(stock) && stock <= 0) return false;
  return true;
}

async function ensureOrderFulfillable(
  supabase: ReturnType<typeof getAdminClient>,
  orderId: string,
): Promise<FulfillmentCheckResult> {
  const { data: rawItems, error: itemsError } = await supabase
    .from("order_items")
    .select("id, product_id, qty, meta")
    .eq("order_id", orderId);

  if (itemsError) {
    throw itemsError;
  }

  const items = (rawItems ?? []) as any[];
  if (!items.length) return { ok: false, code: "order_has_no_items" };

  const skuIds = Array.from(
    new Set(
      items
        .map((item) => {
          const skuId = normalizeSkuId(item?.product_id);
          if (skuId) return skuId;
          const metaSkuId = normalizeSkuId(item?.meta?.sku_id);
          return metaSkuId;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (!skuIds.length) return { ok: false, code: "order_has_no_items" };

  const { data: supplierRows, error: supplierError } = await supabase
    .from("supplier_skus")
    .select("supplier_id, sku_id, is_available, inventory_status, stock_quantity")
    .in("sku_id", skuIds);

  if (supplierError) {
    throw supplierError;
  }

  const rows = (supplierRows ?? []) as any[];
  const bySku = new Map<string, any[]>();

  for (const row of rows) {
    const skuId = normalizeSkuId(row?.sku_id);
    const supplierId = normalizeSkuId(row?.supplier_id);
    if (!skuId || !supplierId) continue;
    const existing = bySku.get(skuId) ?? [];
    existing.push(row);
    bySku.set(skuId, existing);
  }

  const missingSkuIds = skuIds.filter((skuId) => !bySku.has(skuId));
  if (missingSkuIds.length) {
    return { ok: false, code: "missing_supplier_skus", sku_ids: missingSkuIds };
  }

  const oosSkuIds = skuIds.filter((skuId) => {
    const candidates = bySku.get(skuId) ?? [];
    return !candidates.some(isSupplierSkuAvailable);
  });
  if (oosSkuIds.length) {
    return { ok: false, code: "oos_or_unavailable", sku_ids: oosSkuIds };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("response" in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, code: "bad_request", message: "invalid_json" }, 400);
    }

    const orderId = typeof (body as any)?.order_id === "string" ? (body as any).order_id.trim() : "";
    if (!ORDER_ID_RE.test(orderId)) {
      return json({ ok: false, code: "bad_request", message: "order_id_invalid" }, 400);
    }

    const supabase = getAdminClient();
    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, amount_cents, currency, payment_intent_id, paid_at, subtotal, discount_total, shipping_total, grand_total"
      )
      .eq("id", orderId)
      .maybeSingle<OrderRow>();

    if (orderError) {
      return json({ ok: false, code: "db", message: orderError.message }, 500);
    }
    if (!orderRow) {
      return json({ ok: false, code: "not_found" }, 404);
    }

    if (orderRow.user_id && orderRow.user_id !== auth.user.id) {
      return json({ ok: false, code: "forbidden" }, 403);
    }

    const status = String(orderRow.status || "").toLowerCase();
    if (status === "paid" || orderRow.paid_at) {
      return json({ ok: false, code: "already_paid" }, 409);
    }

    const fulfillmentCheck = await ensureOrderFulfillable(supabase, orderId);
    if (!fulfillmentCheck.ok) {
      return json(
        {
          ok: false,
          code: "not_fulfillable",
          reason: fulfillmentCheck.code,
          ...(fulfillmentCheck.code === "missing_supplier_skus" ? { sku_ids: fulfillmentCheck.sku_ids } : {}),
          ...(fulfillmentCheck.code === "oos_or_unavailable" ? { sku_ids: fulfillmentCheck.sku_ids } : {}),
        },
        409
      );
    }

    const { amountCents, currency, source, itemsCount } = await resolveOrderAmount(supabase, orderId, orderRow);
    if (!(amountCents > 0)) {
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("id", orderId);
      const debug = process.env.PAYMENTS_DEBUG === "1" ? { calc_source: source, amount_cents: amountCents, currency, items_count: itemsCount ?? null } : undefined;
      return json({ ok: false, code: "invalid_amount", ...(debug ? { debug } : {}) }, 422);
    }

    let stripe;
    try {
      stripe = ensureStripe();
    } catch (error: any) {
      return json({ ok: false, code: "config_error", message: error?.message ?? "stripe_not_configured" }, 500);
    }

    let existingIntentId = orderRow.payment_intent_id?.trim() || "";
    if (!existingIntentId) {
      const { data: paymentRow } = await supabase
        .from("payments")
        .select("provider_ref, provider")
        .eq("order_id", orderId)
        .eq("provider", "stripe")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ provider_ref: string | null }>();
      if (paymentRow?.provider_ref) {
        existingIntentId = paymentRow.provider_ref.trim();
      }
    }

    let intent: Stripe.PaymentIntent | null = null;

    if (existingIntentId) {
      try {
        const fetched = await stripe.paymentIntents.retrieve(existingIntentId);
        if (fetched.status === "succeeded") {
          const updateError = await updateOrderPaymentState(
            supabase,
            orderId,
            {
              status: "paid",
              paid_at: fetched.created ? new Date(fetched.created * 1000).toISOString() : new Date().toISOString(),
              payment_intent_id: fetched.id,
              amount_cents: amountCents,
              currency,
              payment_status: mapPaymentStatus(fetched.status),
            },
            { allowedStatuses: ["pending", "failed"] }
          );
          if (updateError) {
            return json({ ok: false, code: "db", message: updateError.message || String(updateError) }, 500);
          }
          await upsertPaymentRecord(supabase, orderId, fetched, currency, amountCents);
          return json({ ok: false, code: "already_paid" }, 409);
        }
        const fetchedCurrency = normalizeCurrency(fetched.currency);
        if (fetched.amount !== amountCents || fetchedCurrency !== currency) {
          return json(
            {
              ok: false,
              code: "amount_mismatch",
              message: "stripe_payment_intent_amount_mismatch",
            },
            409
          );
        } else {
          intent = fetched;
        }
      } catch {
        intent = null;
      }
    }

    if (!intent) {
      intent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency,
          metadata: { order_id: orderId, user_id: auth.user.id },
          automatic_payment_methods: { enabled: true },
        },
        { idempotencyKey: `order-${orderId}` }
      );
    }

    const isSucceeded = intent.status === "succeeded";
    const paymentStatus = mapPaymentStatus(intent.status);
    const updateError = await updateOrderPaymentState(
      supabase,
      orderId,
      {
        status: isSucceeded ? "paid" : "pending",
        paid_at: isSucceeded ? new Date().toISOString() : null,
        payment_intent_id: intent.id,
        amount_cents: amountCents,
        currency,
        payment_status: paymentStatus,
      },
      { allowedStatuses: ["pending", "failed"] }
    );

    if (updateError) {
      return json({ ok: false, code: "db", message: updateError.message || String(updateError) }, 500);
    }

    await upsertPaymentRecord(supabase, orderId, intent, currency, amountCents);

    if (!intent.client_secret) {
      return json({ ok: false, code: "stripe_error", message: "missing_client_secret" }, 502);
    }

    const debug = process.env.PAYMENTS_DEBUG === "1" ? { calc_source: source, amount_cents: amountCents, currency, items_count: itemsCount ?? null } : undefined;
    return json({
      ok: true,
      order_id: orderId,
      client_secret: intent.client_secret,
      status: intent.status,
      ...(debug ? { debug } : {}),
    });
  } catch (error: any) {
    const message = error?.message ?? "internal_error";
    return json({ ok: false, code: "internal", message }, 500);
  }
}

export async function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
