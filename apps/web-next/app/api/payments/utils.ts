import Stripe from "stripe";
import { getAdminClient } from "@/utils/supabase/admin";

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

export function mapPaymentStatus(status: Stripe.PaymentIntent.Status): string {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "canceled":
      return "failed";
    case "processing":
      return "processing";
    default:
      return "pending";
  }
}

export async function updateOrderPaymentState(
  supabase: AdminSupabaseClient,
  orderId: string,
  payload: Record<string, unknown>
) {
  const mutable: Record<string, unknown> = { ...payload };
  const fallbackFields = ["amount_cents", "currency", "payment_intent_id", "paid_at", "status"];

  while (Object.keys(mutable).length) {
    const { error } = await supabase.from("orders").update(mutable).eq("id", orderId);
    if (!error) return null;

    const message = String(error.message || "");
    console.error("[payments] order update failed", {
      orderId,
      payload: mutable,
      message,
    });

    const lower = message.toLowerCase();
    const fieldToDrop = fallbackFields.find((field) => field in mutable && lower.includes(field));
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
