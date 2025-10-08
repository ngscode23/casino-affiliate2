import { NextResponse } from "next/server";

import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

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

function normalizeField(value: unknown, max = 512): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) return trimmed.slice(0, max);
  return trimmed;
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
      .map((item) => ({ id: String(item.id), qty: Math.max(1, Number(item.qty ?? 1)) }))
      .filter((item) => isUuid(item.id));

    const currency =
      typeof payload.currency === "string" && payload.currency.trim()
        ? payload.currency.trim()
        : undefined;
    const checkoutMeta = extractCheckout(payload.checkout ?? null);

    let rpcResponse;
    if (items.length) {
      rpcResponse = await supabase.rpc("place_order_with_items", {
        p_user_id: userId,
        p_items: items,
        p_currency: currency,
      });
    } else {
      rpcResponse = await supabase.rpc("place_order", { p_user_id: userId });
    }

    if (rpcResponse.error) {
      console.error("orders-create", rpcResponse.error);
      if (
        rpcResponse.error.code === "23503" &&
        typeof rpcResponse.error.message === "string" &&
        rpcResponse.error.message.includes("orders_user_id_fkey")
      ) {
        return json({ ok: false, code: "user_not_found", message: "User record missing" }, 409);
      }
      return json({ ok: false, code: "db", message: "Database error" }, 500);
    }

    const orderId = typeof rpcResponse.data === "string" && rpcResponse.data ? rpcResponse.data : null;

    if (checkoutMeta && orderId) {
      const { error } = await supabase
        .from("orders")
        .update({ checkout_metadata: checkoutMeta })
        .eq("id", orderId);
      if (error) {
        console.warn("orders-create checkout metadata", error);
      }
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
