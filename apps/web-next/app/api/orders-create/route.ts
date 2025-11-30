import { NextResponse } from "next/server";

import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { applyPromotionsToOrder } from "@/lib/promotions/apply";
import type { SupabaseClient } from "@supabase/supabase-js";

type OrderItemInput = { id?: string; qty?: number };

type CheckoutContact = {
  fullName?: string;
  email?: string;
};

type CheckoutShipping = {
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
};

type CheckoutPayload = {
  contact?: CheckoutContact;
  shipping?: CheckoutShipping;
};

type OrderPayload = {
  items?: OrderItemInput[];
  currency?: string;
  checkout?: CheckoutPayload | null;
  coupons?: string[];
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parsePayload(body: unknown): OrderPayload {
  if (!body || typeof body !== "object") return {};
  return body as OrderPayload;
}

function sanitizeQuantity(value: unknown): number {
  if (typeof value === "number") {
    if (Number.isFinite(value)) return Math.max(1, Math.round(value));
    return 1;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.round(parsed));
}

function normalizeField(value: unknown, max = 512): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) return trimmed.slice(0, max);
  return trimmed;
}

function normalizeCurrency3(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().slice(0, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return undefined;
  return code;
}

async function logPurchaseEvents(
  supabase: SupabaseClient,
  userId: string | null,
  orderId: string | null,
) {
  if (!userId || !orderId) return;
  try {
    const { data: items, error } = await supabase
      .from("order_items")
      .select("product_id, qty, unit_price, total, meta")
      .eq("order_id", orderId);
    if (error) {
      console.warn("orders-create purchase log: fetch items failed", error);
      return;
    }
    if (!items?.length) return;

    const events = items
      .filter((item) => item && typeof item.product_id === "string")
      .map((item) => {
        const qty = typeof item.qty === "number" && Number.isFinite(item.qty) ? Math.max(1, Math.round(item.qty)) : 1;
        const total = Number(item.total ?? 0);
        const unit = Number(item.unit_price ?? 0);
        const priceCents = Number.isFinite(total) && total > 0
          ? Math.round(total * 100)
          : Number.isFinite(unit)
            ? Math.round(unit * 100 * qty)
            : null;
        return {
          anon_id: userId,
          event: "purchase" as const,
          product_id: item.product_id as string,
          weight: qty,
          price_cents: priceCents,
          metadata: {
            order_id: orderId,
            ...(item.meta && typeof item.meta === "object" ? { item_meta: item.meta } : {}),
          },
        };
      })
      .filter((row) => row.product_id);

    if (events.length) {
      const { error: insertError } = await supabase.from("user_events").insert(events);
      if (insertError) {
        console.warn("orders-create purchase log insert failed", insertError);
      }
    }
  } catch (err) {
    console.warn("orders-create purchase log unexpected error", err);
  }
}

function extractCheckout(raw: unknown): CheckoutPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as CheckoutPayload;
  const contactRaw = source.contact || {};
  const shippingRaw = source.shipping || {};
  const contact: CheckoutContact = {};
  const shipping: CheckoutShipping = {};

  const name = normalizeField((contactRaw as CheckoutContact).fullName, 160);
  if (name) contact.fullName = name;
  const email = normalizeField((contactRaw as CheckoutContact).email, 254);
  if (email) contact.email = email;

  const address = normalizeField((shippingRaw as CheckoutShipping).address);
  if (address) shipping.address = address;
  const city = normalizeField((shippingRaw as CheckoutShipping).city, 120);
  if (city) shipping.city = city;
  const postal = normalizeField((shippingRaw as CheckoutShipping).postalCode, 40);
  if (postal) shipping.postalCode = postal;
  const notes = normalizeField((shippingRaw as CheckoutShipping).notes, 500);
  if (notes) shipping.notes = notes;

  const hasContact = Object.keys(contact).length > 0;
  const hasShipping = Object.keys(shipping).length > 0;
  if (!hasContact && !hasShipping) return null;

  const result: CheckoutPayload = {};
  if (hasContact) result.contact = contact;
  if (hasShipping) result.shipping = shipping;
  return result;
}

export async function POST(request: Request) {
  // Пытаемся определить пользователя, но не блокируем гостевой чекаут
  let userId: string | null = null;
  try {
    const maybeAuth = await requireAuth(request);
    if (!("response" in maybeAuth)) {
      userId = maybeAuth.user.id;
    }
  } catch (error) {
    console.warn("[orders-create] requireAuth failed, continuing anonymously", error);
  }

  if (!userId) {
    return json(
      { ok: false, code: "not_authenticated", message: "Login required to place an order" },
      401,
    );
  }

  const supabase = getAdminClient();

  try {
    try {
      const orphanCheck = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .is("user_id", null);
      if (!orphanCheck.error && (orphanCheck.count ?? 0) > 0) {
        console.warn("orders-create", {
          warning: "orphan_orders_detected",
          count: orphanCheck.count,
        });
      }
    } catch (orphanError) {
      console.warn("orders-create orphan check failed", orphanError);
    }

  const payload = parsePayload(await request.json().catch(() => ({})));
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const items = rawItems
      .filter((item): item is { id: string; qty?: number } => Boolean(item && item.id))
      .map((item) => ({ id: String(item.id), qty: sanitizeQuantity(item.qty ?? 1) }))
      .filter((item) => isUuid(item.id));

    // Enforce 3-letter uppercase currency code to satisfy FK to public.currencies(code)
    const currency = normalizeCurrency3(payload.currency);
  const checkoutMeta = extractCheckout(payload.checkout ?? null);
  const couponCodes = Array.isArray(payload.coupons)
    ? payload.coupons.filter((code): code is string => typeof code === "string" && code.trim().length > 0)
    : [];

    if (!items.length) {
      return json(
        { ok: false, code: "empty_order", message: "No items provided" },
        400,
      );
    }

    const rpcResponse = await supabase.rpc("place_order_with_items", {
      p_user_id: userId,
      p_items: items,
      p_currency: currency,
    });

    if (rpcResponse.error) {
      console.error("orders-create", rpcResponse.error);
      const err = rpcResponse.error;
      const code = String(err.code || "");
      const message = String(err.message || "");
      if (
        code === "23503" &&
        message.includes("orders_user_id_fkey")
      ) {
        return json({ ok: false, code: "user_not_found", message: "User record missing" }, 409);
      }
      if (code === "22023") {
        if (message.includes("unsupported_currency")) {
          return json({ ok: false, code: "bad_currency", message: "unsupported_currency" }, 400);
        }
        if (message.includes("empty_order_payload")) {
          return json({ ok: false, code: "invalid_payload", message: "empty_order" }, 400);
        }
        if (message.includes("order_total_zero_after_insert")) {
          return json({ ok: false, code: "invalid_order_total" }, 400);
        }
      }
      return json({ ok: false, code: "db", message: "Database error" }, 500);
    }

    const orderId = typeof rpcResponse.data === "string" && rpcResponse.data ? rpcResponse.data : null;

      if (orderId) {
        if (checkoutMeta) {
          const { error } = await supabase
            .from("orders")
            .update({ checkout_metadata: checkoutMeta })
          .eq("id", orderId);
        if (error) {
          console.warn("orders-create checkout metadata", error);
        }
      }
      if (couponCodes.length) {
        try {
          await applyPromotionsToOrder({
            supabase,
            orderId,
            couponCodes,
          });
        } catch (applyError) {
          console.warn("orders-create apply promotions failed", applyError);
        }
      }

      await logPurchaseEvents(supabase, userId, orderId);
    }

    return json({ ok: true, order_id: orderId || rpcResponse.data }, 200);
  } catch (error: any) {
    console.error("orders-create", error);
    return json({ ok: false, code: "internal", message: String(error?.message ?? error) }, 500);
  }
}

export function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
