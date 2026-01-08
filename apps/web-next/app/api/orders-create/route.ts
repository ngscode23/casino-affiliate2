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

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
      .map((item) => {
        const meta = item.meta && typeof item.meta === "object" ? (item.meta as Record<string, unknown>) : null;
        const catalogId =
          typeof meta?.catalog_product_id === "string" && meta.catalog_product_id.trim()
            ? meta.catalog_product_id.trim()
            : null;
        const productId =
          typeof item.product_id === "string" && item.product_id.trim() ? item.product_id.trim() : catalogId;
        if (!productId) return null;

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
          product_id: productId,
          weight: qty,
          price_cents: priceCents,
          metadata: {
            order_id: orderId,
            ...(meta ? { item_meta: meta } : {}),
          },
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row?.product_id));

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

    const { data: productRows, error: productError } = await supabase
      .from("catalog_products_v")
      .select("id, slug, title, price, currency, status, brand_slug, brand_name, category_slug, category_title")
      .in("id", items.map((item) => item.id));

    if (productError || !Array.isArray(productRows)) {
      console.error("orders-create: failed to load catalog products", productError);
      return json({ ok: false, code: "catalog_lookup_failed", message: "Catalog lookup failed" }, 500);
    }

    const productById = new Map<string, Record<string, unknown>>();
    for (const row of productRows) {
      const id = typeof row?.id === "string" ? row.id : row?.id != null ? String(row.id) : "";
      if (id) productById.set(id, row as Record<string, unknown>);
    }

    const missingIds = items.map((item) => item.id).filter((id) => !productById.has(id));
    if (missingIds.length) {
      return json(
        { ok: false, code: "missing_products", message: "Some products are missing", ids: missingIds },
        400,
      );
    }

    const allowedStatuses = new Set(["published", "active"]);
    const inactiveIds = items
      .map((item) => item.id)
      .filter((id) => {
        const status = String((productById.get(id)?.status ?? "")).toLowerCase();
        return status && !allowedStatuses.has(status);
      });
    if (inactiveIds.length) {
      return json(
        { ok: false, code: "inactive_products", message: "Some products are inactive", ids: inactiveIds },
        400,
      );
    }

    const currencyFromProducts =
      productRows
        .map((row) => (typeof (row as any)?.currency === "string" ? String((row as any).currency).trim() : ""))
        .find((value) => value) ?? undefined;
    const effectiveCurrency = currency ?? currencyFromProducts ?? "EUR";
    const mismatchedCurrency = productRows.some((row) => {
      const rowCurrency = typeof (row as any)?.currency === "string" ? String((row as any).currency).trim() : "";
      return rowCurrency && rowCurrency.toUpperCase() !== effectiveCurrency.toUpperCase();
    });
    if (mismatchedCurrency) {
      return json({ ok: false, code: "currency_mismatch", message: "Currency mismatch" }, 400);
    }

    const orderItems = items.map((item) => {
      const row = productById.get(item.id) ?? {};
      const unitPriceRaw = Number((row as any).price ?? 0);
      const unitPrice = Number.isFinite(unitPriceRaw) ? Math.max(0, unitPriceRaw) : 0;
      const total = roundCurrency(unitPrice * item.qty);
      const title =
        typeof (row as any).title === "string" && (row as any).title.trim()
          ? (row as any).title.trim()
          : typeof (row as any).slug === "string"
            ? (row as any).slug
            : "Product";

      return {
        order_id: "",
        product_id: null,
        qty: item.qty,
        title,
        unit_price: unitPrice,
        variant_id: null,
        meta: {
          catalog_product_id: item.id,
          slug: (row as any).slug ?? null,
          brand_slug: (row as any).brand_slug ?? null,
          brand_name: (row as any).brand_name ?? null,
          category_slug: (row as any).category_slug ?? null,
          category_title: (row as any).category_title ?? null,
          currency: effectiveCurrency,
          unit_price: unitPrice,
          total,
        },
      };
    });

    const subtotal = roundCurrency(orderItems.reduce((sum, item) => sum + (item.meta?.total ?? 0), 0));
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return json({ ok: false, code: "invalid_order_total", message: "Order total is zero" }, 400);
    }

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        currency: effectiveCurrency,
        subtotal,
        shipping_total: 0,
        discount_total: 0,
        grand_total: subtotal,
        amount_cents: Math.round(subtotal * 100),
        status: "pending",
        payment_status: "pending",
        checkout_metadata: checkoutMeta ?? undefined,
        coupon_codes: couponCodes,
        applied_promotions: [],
      })
      .select("id")
      .maybeSingle();

    if (orderError || !orderRow?.id) {
      console.error("orders-create: failed to create order", orderError);
      return json({ ok: false, code: "order_create_failed", message: "Failed to create order" }, 500);
    }

    const orderId = String(orderRow.id);
    const insertItems = orderItems.map((item) => ({ ...item, order_id: orderId }));
    const { error: itemsError } = await supabase.from("order_items").insert(insertItems);
    if (itemsError) {
      console.error("orders-create: failed to insert order items", itemsError);
      return json({ ok: false, code: "order_items_failed", message: "Failed to insert order items" }, 500);
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

    return json({ ok: true, order_id: orderId }, 200);
  } catch (error: any) {
    console.error("orders-create", error);
    return json({ ok: false, code: "internal", message: String(error?.message ?? error) }, 500);
  }
}

export function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
