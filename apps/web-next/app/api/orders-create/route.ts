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

type SkuRow = {
  id: string;
  slug: string | null;
  title: string | null;
  price: number | string | null;
  currency: string | null;
  status: string | null;
  is_available: boolean | null;
  inventory_status: string | null;
  catalog_product_id: string | null;
};

type CatalogRow = {
  id: string;
  status: string | null;
  brand_slug: string | null;
  brand_name: string | null;
  category_slug: string | null;
  category_title: string | null;
};

const ALLOWED_STATUSES = new Set(["published", "active"]);

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isSkuActive(row: SkuRow): boolean {
  const status = normalizeStatus(row.status);
  return !status || ALLOWED_STATUSES.has(status);
}

function isSkuAvailable(row: SkuRow): boolean {
  if (row.is_available === false) return false;
  const inventory = normalizeStatus(row.inventory_status);
  if (inventory === "out_of_stock") return false;
  return true;
}

function pickBestSku(rows: SkuRow[]): SkuRow | null {
  const active = rows.filter(isSkuActive);
  if (!active.length) return null;
  const available = active.filter(isSkuAvailable);
  const candidates = available.length ? available : active;
  return candidates.sort((a, b) => {
    const aPrice = Number(a.price ?? 0);
    const bPrice = Number(b.price ?? 0);
    if (!Number.isFinite(aPrice) && !Number.isFinite(bPrice)) return 0;
    if (!Number.isFinite(aPrice)) return 1;
    if (!Number.isFinite(bPrice)) return -1;
    return aPrice - bPrice;
  })[0] ?? null;
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
  let userEmail: string | null = null;
  try {
    const maybeAuth = await requireAuth(request);
    if (!("response" in maybeAuth)) {
      userId = maybeAuth.user.id;
      userEmail = maybeAuth.user.email?.trim() || null;
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
    const checkoutEmail = checkoutMeta?.contact?.email && checkoutMeta.contact.email.trim()
      ? checkoutMeta.contact.email.trim()
      : null;
    const fallbackEmail = checkoutEmail || (userId ? userEmail?.trim() || null : null);
    const checkoutMetaWithEmail = (() => {
      if (!fallbackEmail) return checkoutMeta ?? null;
      if (checkoutMeta && typeof checkoutMeta === "object") {
        return { ...checkoutMeta, contact_email: fallbackEmail };
      }
      return { contact_email: fallbackEmail };
    })();
    const couponCodes = Array.isArray(payload.coupons)
      ? payload.coupons.filter((code): code is string => typeof code === "string" && code.trim().length > 0)
      : [];

    if (!items.length) {
      return json(
        { ok: false, code: "empty_order", message: "No items provided" },
        400,
      );
    }

    const requestedIds = items.map((item) => item.id);
    const { data: skuRows, error: skuError } = await supabase
      .from("ecom_products")
      .select("id, slug, title, price, currency, status, is_available, inventory_status, catalog_product_id")
      .in("id", requestedIds);

    if (skuError || !Array.isArray(skuRows)) {
      console.error("orders-create: failed to load sku products", skuError);
      return json({ ok: false, code: "sku_lookup_failed", message: "SKU lookup failed" }, 500);
    }

    const skuById = new Map<string, SkuRow>();
    for (const row of skuRows as any[]) {
      if (row?.id) skuById.set(String(row.id), row as SkuRow);
    }

    const legacyModelIds = requestedIds.filter((id) => !skuById.has(id));
    const legacySkuMap = new Map<string, SkuRow>();

    if (legacyModelIds.length) {
      const { data: legacyRows, error: legacyError } = await supabase
        .from("ecom_products")
        .select("id, slug, title, price, currency, status, is_available, inventory_status, catalog_product_id")
        .in("catalog_product_id", legacyModelIds);

      if (legacyError || !Array.isArray(legacyRows)) {
        console.error("orders-create: failed legacy sku lookup", legacyError);
        return json({ ok: false, code: "sku_lookup_failed", message: "SKU lookup failed" }, 500);
      }

      const grouped = new Map<string, SkuRow[]>();
      for (const row of legacyRows as any[]) {
        const modelId = typeof row?.catalog_product_id === "string" ? row.catalog_product_id : null;
        if (!modelId) continue;
        const arr = grouped.get(modelId) ?? [];
        arr.push(row as SkuRow);
        grouped.set(modelId, arr);
      }

      for (const modelId of legacyModelIds) {
        const picked = pickBestSku(grouped.get(modelId) ?? []);
        if (picked) legacySkuMap.set(modelId, picked);
      }
    }

    const resolvedItems: Array<{ requestedId: string; sku: SkuRow; qty: number; legacyModelId: string | null }> = [];
    const missingIds: string[] = [];

    for (const item of items) {
      let sku = skuById.get(item.id) ?? null;
      let legacyModelId: string | null = null;
      if (!sku) {
        sku = legacySkuMap.get(item.id) ?? null;
        if (sku) legacyModelId = item.id;
      }

      if (!sku) {
        missingIds.push(item.id);
        continue;
      }
      resolvedItems.push({ requestedId: item.id, sku, qty: item.qty, legacyModelId });
    }

    if (missingIds.length) {
      return json(
        { ok: false, code: "missing_products", message: "Some products are missing", ids: missingIds },
        400,
      );
    }

    const inactiveIds = resolvedItems
      .filter(({ sku }) => !isSkuActive(sku) || !isSkuAvailable(sku))
      .map((item) => item.requestedId);
    if (inactiveIds.length) {
      return json(
        { ok: false, code: "inactive_products", message: "Some products are inactive", ids: inactiveIds },
        400,
      );
    }

    const catalogIds = new Set<string>();
    const missingCatalogLinks = resolvedItems
      .filter(({ sku }) => {
        const modelId = typeof sku.catalog_product_id === "string" ? sku.catalog_product_id.trim() : "";
        if (modelId) {
          catalogIds.add(modelId);
          return false;
        }
        return true;
      })
      .map((item) => item.requestedId);

    if (missingCatalogLinks.length) {
      return json(
        { ok: false, code: "missing_catalog_link", message: "Some SKUs are missing catalog links", ids: missingCatalogLinks },
        400,
      );
    }

    const { data: catalogRows, error: catalogError } = await supabase
      .from("catalog_products_v")
      .select("id, status, brand_slug, brand_name, category_slug, category_title")
      .in("id", Array.from(catalogIds));

    if (catalogError || !Array.isArray(catalogRows)) {
      console.error("orders-create: failed to load catalog products", catalogError);
      return json({ ok: false, code: "catalog_lookup_failed", message: "Catalog lookup failed" }, 500);
    }

    const catalogById = new Map<string, CatalogRow>();
    for (const row of catalogRows as any[]) {
      if (row?.id) catalogById.set(String(row.id), row as CatalogRow);
    }

    const inactiveModelIds = resolvedItems
      .filter(({ sku }) => {
        const modelId = String(sku.catalog_product_id ?? "");
        const model = catalogById.get(modelId);
        if (!model) return true;
        const status = normalizeStatus(model.status);
        return status && !ALLOWED_STATUSES.has(status);
      })
      .map((item) => item.requestedId);

    if (inactiveModelIds.length) {
      return json(
        { ok: false, code: "inactive_products", message: "Some products are inactive", ids: inactiveModelIds },
        400,
      );
    }

    const currencyCandidates = resolvedItems
      .map(({ sku }) => (typeof sku.currency === "string" ? sku.currency.trim().toUpperCase() : ""))
      .filter((value) => value);
    const currencySet = new Set(currencyCandidates);

    if (currencySet.size > 1) {
      return json({ ok: false, code: "currency_mismatch", message: "Currency mismatch" }, 400);
    }

    const currencyFromSkus = currencySet.size === 1 ? Array.from(currencySet)[0] : undefined;
    const effectiveCurrency = currency ?? currencyFromSkus ?? "EUR";
    if (currencyFromSkus && currencyFromSkus.toUpperCase() !== effectiveCurrency.toUpperCase()) {
      return json({ ok: false, code: "currency_mismatch", message: "Currency mismatch" }, 400);
    }

    const orderItems = resolvedItems.map(({ sku, qty, legacyModelId }) => {
      const unitPriceRaw = Number(sku.price ?? 0);
      const unitPrice = Number.isFinite(unitPriceRaw) ? Math.max(0, unitPriceRaw) : 0;
      const total = roundCurrency(unitPrice * qty);
      const title =
        typeof sku.title === "string" && sku.title.trim()
          ? sku.title.trim()
          : typeof sku.slug === "string"
            ? sku.slug
            : "Product";

      const modelId = String(sku.catalog_product_id ?? "");
      const model = modelId ? catalogById.get(modelId) ?? null : null;

      return {
        order_id: "",
        product_id: String(sku.id),
        qty,
        title,
        unit_price: unitPrice,
        variant_id: null,
        meta: {
          sku_id: sku.id,
          sku_slug: sku.slug ?? null,
          catalog_product_id: modelId || null,
          brand_slug: model?.brand_slug ?? null,
          brand_name: model?.brand_name ?? null,
          category_slug: model?.category_slug ?? null,
          category_title: model?.category_title ?? null,
          currency: effectiveCurrency,
          unit_price: unitPrice,
          total,
          ...(legacyModelId ? { legacy_model_id: legacyModelId, legacy_model_to_sku: true } : {}),
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
        checkout_metadata: checkoutMetaWithEmail ?? undefined,
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
