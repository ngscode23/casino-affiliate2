import Stripe from "stripe";
import { getAdminClient } from "@/utils/supabase/admin";
import { toNumber } from "../orders/utils";

export type AdminSupabaseClient = ReturnType<typeof getAdminClient>;

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2022-11-15";

let stripeClient: Stripe | null = null;

export function ensureStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const secret =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET ||
    process.env.STRIPE_API_KEY ||
    "";
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  stripeClient = new Stripe(secret, { apiVersion: STRIPE_API_VERSION });
  return stripeClient;
}

export function normalizeCurrency(input: string | null | undefined): string {
  const normalized = (input || "").trim().toLowerCase();
  return normalized || "usd";
}

export type OrderRow = {
  id: string;
  user_id: string | null;
  status: string | null;
  amount_cents: number | null;
  currency: string | null;
  paid_at: string | null;
  payment_intent_id: string | null;
  subtotal?: number | string | null;
  discount_total?: number | string | null;
  shipping_total?: number | string | null;
  grand_total?: number | string | null;
  metadata_b?: Record<string, unknown> | null;
};

export async function resolveOrderAmount(
  supabase: AdminSupabaseClient,
  orderId: string,
  row: OrderRow
): Promise<{ amountCents: number; currency: string; source: string; itemsCount?: number }> {
  let amountCents = Number(row.amount_cents ?? 0);
  let currency = normalizeCurrency(row.currency);
  let source = "orders";
  let itemsCount: number | undefined = undefined;

  if (!(amountCents > 0)) {
    const { data: viewRow } = await supabase
      .from("order_v2")
      .select("amount_total, currency")
      .eq("id", orderId)
      .maybeSingle();
    if (viewRow) {
      amountCents = Math.round(toNumber((viewRow as any).amount_total) * 100);
      currency = normalizeCurrency((viewRow as any).currency) || currency;
      source = "order_v2";
    }
  }

  if (!(amountCents > 0)) {
    const subtotal = toNumber(row.subtotal);
    const discount = toNumber(row.discount_total);
    const shipping = toNumber(row.shipping_total);
    const grand = toNumber(row.grand_total);
    const fallbackTotal = grand || subtotal - discount + shipping;
    if (fallbackTotal > 0) {
      amountCents = Math.round(fallbackTotal * 100);
      source = "totals";
    }
  }

  if (!(amountCents > 0)) {
    const { data: items } = await supabase
      .from("order_items")
      .select("total, qty, unit_price")
      .eq("order_id", orderId);

    if (Array.isArray(items)) {
      itemsCount = items.length;
      const sum = items.reduce((acc, item: any) => {
        const total = toNumber(item.total);
        if (total > 0) return acc + total;
        const qty = toNumber(item.qty);
        const unit = toNumber(item.unit_price);
        return acc + qty * unit;
      }, 0);
      if (sum > 0) {
        amountCents = Math.round(sum * 100);
        source = "items";
      }
    }
  }

  return { amountCents, currency, source, itemsCount };
}

export function mapPaymentStatus(status: Stripe.PaymentIntent.Status): string {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "requires_action":
      return "requires_action";
    case "requires_capture":
      return "authorized";
    case "canceled":
      return "canceled";
    case "processing":
      return "processing";
    case "requires_payment_method":
      return "failed";
    case "requires_confirmation":
      return "pending";
    default:
      return "pending";
  }
}

export function mergeOrderMetadata(
  existing: unknown,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return { ...base, ...patch };
}

type UpdateOrderPaymentStateOptions = {
  allowedStatuses?: string[];
};

export async function updateOrderPaymentState(
  supabase: AdminSupabaseClient,
  orderId: string,
  payload: Record<string, unknown>,
  options: UpdateOrderPaymentStateOptions = {}
) {
  const mutable: Record<string, unknown> = { ...payload };
  const fallbackFields = [
    "metadata_b",
    "amount_cents",
    "currency",
    "payment_intent_id",
    "paid_at",
    "status",
  ];
  const allowedStatuses = options.allowedStatuses?.filter((value) => typeof value === "string" && value.trim());

  while (Object.keys(mutable).length) {
    let query = supabase.from("orders").update(mutable).eq("id", orderId);
    if (allowedStatuses?.length) {
      query = query.in(
        "status",
        allowedStatuses.map((value) => value.trim().toLowerCase())
      );
    }
    const { error } = await query;
    if (!error) return null;

    const message = String(error.message || "");
    console.error("[payments] order update failed", {
      orderId,
      payload: mutable,
      message,
    });

    const lower = message.toLowerCase();
    const fieldToDrop = fallbackFields.find(
      (field) => field in mutable && lower.includes(field),
    );
    if (!fieldToDrop) {
      return error;
    }
    delete mutable[fieldToDrop];
  }

  return null;
}

export async function upsertPaymentRecord(
  supabase: AdminSupabaseClient,
  orderId: string,
  intent: Stripe.PaymentIntent,
  currency: string,
  amountCents: number
) {
  try {
    const { data: existing } = await supabase
      .from("payments")
      .select("id, provider_ref")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; provider_ref: string | null }>();

    const payload = {
      order_id: orderId,
      provider: "stripe",
      provider_ref: intent.id,
      amount: amountCents / 100,
      currency: currency.toUpperCase(),
      status: mapPaymentStatus(intent.status),
    } as const;

    if (existing?.id) {
      await supabase.from("payments").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("payments").insert(payload);
    }
  } catch {
    // ignore sync errors
  }
}
