import { getAdminClient } from "@/utils/supabase/admin";
import { recordWebhookLog } from "@/app/api/payments/observability";
import { resolveOffersForSkus, type BestOfferSelection, type BestOfferResult } from "@/lib/pricing-inventory";

type OrderItemRow = {
  id: string;
  product_id: string | null;
  qty: number | null;
  meta: Record<string, unknown> | null;
  title: string | null;
};

function normalizeSkuId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function resolveDefaultSupplierId(
  supabase: ReturnType<typeof getAdminClient>
): Promise<string | null> {
  const { data } = await supabase
    .from("suppliers")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

export async function createPurchaseOrderForPaidOrder(params: {
  supabase: ReturnType<typeof getAdminClient>;
  orderId: string;
  eventId: string;
  orderCurrency: string | null;
}): Promise<void> {
  const { supabase, orderId, eventId, orderCurrency } = params;

  try {
    const { data: rawItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_id, qty, meta, title")
      .eq("order_id", orderId);

    if (itemsError) {
      await recordWebhookLog({
        supabase,
        type: "dropship.po.fetch_items_failed",
        status: "error",
        eventId,
        message: itemsError.message || "order_items_lookup_failed",
        payload: { orderId },
      });
      return;
    }

    const items = (rawItems ?? []) as OrderItemRow[];
    if (!items.length) {
      await recordWebhookLog({
        supabase,
        type: "dropship.po.empty_order",
        status: "warning",
        eventId,
        message: "No order items found for paid order",
        payload: { orderId },
      });
      return;
    }

    const resolvedItems: Array<{
      orderItemId: string;
      skuId: string;
      qty: number;
      title: string | null;
    }> = [];
    const missingSkuRefs: string[] = [];

    for (const item of items) {
      const meta = item.meta && typeof item.meta === "object" ? item.meta : null;
      const metaSku = normalizeSkuId((meta as any)?.sku_id);
      const skuId = normalizeSkuId(item.product_id) ?? metaSku;
      if (!skuId) {
        missingSkuRefs.push(String(item.id ?? ""));
        continue;
      }
      const qty = typeof item.qty === "number" && Number.isFinite(item.qty) ? Math.max(1, Math.round(item.qty)) : 1;
      resolvedItems.push({
        orderItemId: String(item.id ?? ""),
        skuId,
        qty,
        title: item.title ?? null,
      });
    }

    if (!resolvedItems.length) {
      await recordWebhookLog({
        supabase,
        type: "dropship.po.missing_sku_refs",
        status: "warning",
        eventId,
        message: "Order items missing SKU references",
        payload: { orderId, missingSkuRefs },
      });
      return;
    }

    const skuIds = Array.from(new Set(resolvedItems.map((item) => item.skuId)));
    let bestOffers: Map<string, BestOfferResult>;
    try {
      bestOffers = await resolveOffersForSkus({ supabase, skuIds, requireInventory: true });
    } catch (error: any) {
      await recordWebhookLog({
        supabase,
        type: "dropship.po.offer_lookup_failed",
        status: "error",
        eventId,
        message: error?.message || "supplier_offers_lookup_failed",
        payload: { orderId },
        error,
      });
      return;
    }

    const unavailableSupplierSkus: string[] = [];
    const inventoryMissingSkus: string[] = [];
    const offerUnavailableSkus: string[] = [];
    for (const id of skuIds) {
      const result = bestOffers.get(id);
      if (!result) {
        offerUnavailableSkus.push(id);
        continue;
      }
      if (!result.ok) {
        if (result.reason === "inventory_missing" || result.reason === "inventory_stale") {
          inventoryMissingSkus.push(id);
        } else if (result.reason === "out_of_stock") {
          unavailableSupplierSkus.push(id);
        } else {
          offerUnavailableSkus.push(id);
        }
        continue;
      }
      if (result.selection.availabilityRank >= 2) {
        unavailableSupplierSkus.push(id);
      }
    }

    if (missingSkuRefs.length || unavailableSupplierSkus.length || inventoryMissingSkus.length || offerUnavailableSkus.length) {
      const parts: string[] = [];
      if (missingSkuRefs.length) parts.push(`missing_sku_refs:${missingSkuRefs.join(",")}`);
      if (unavailableSupplierSkus.length) parts.push(`unavailable_supplier_skus:${unavailableSupplierSkus.join(",")}`);
      if (inventoryMissingSkus.length) parts.push(`inventory_missing:${inventoryMissingSkus.join(",")}`);
      if (offerUnavailableSkus.length) parts.push(`offer_unavailable:${offerUnavailableSkus.join(",")}`);
      const errorMessage = parts.join("; ").slice(0, 500);

      const fallbackSupplierId = await resolveDefaultSupplierId(supabase);
      if (!fallbackSupplierId) {
        await recordWebhookLog({
          supabase,
          type: "dropship.po.missing_supplier",
          status: "error",
          eventId,
          message: "No supplier available to create failed PO",
          payload: {
            orderId,
            missingSkuRefs,
            unavailableSupplierSkus,
            inventoryMissingSkus,
            offerUnavailableSkus,
          },
        });
        return;
      }

      const { data: poRow } = await supabase
        .from("purchase_orders")
        .upsert(
          {
            order_id: orderId,
            supplier_id: fallbackSupplierId,
            status: "failed",
            currency: orderCurrency ?? null,
            error_message: errorMessage || "supplier_mapping_failed",
          },
          { onConflict: "order_id,supplier_id", ignoreDuplicates: true }
        )
        .select("id")
        .maybeSingle<{ id: string }>();

      await recordWebhookLog({
        supabase,
        type: "dropship.po.failed",
        status: "warning",
        eventId,
        message: "PO created in failed status",
        payload: { orderId, purchaseOrderId: poRow?.id ?? null, error: errorMessage },
      });
      return;
    }

    const supplierSkuRows = await supabase
      .from("supplier_skus")
      .select("supplier_id, sku_id, supplier_sku, cost_cents, currency")
      .in("sku_id", skuIds);

    const supplierSkuMap = new Map<
      string,
      { supplier_sku: string | null; cost_cents: number | null; currency: string | null }
    >();
    if (!supplierSkuRows.error && Array.isArray(supplierSkuRows.data)) {
      for (const row of supplierSkuRows.data as any[]) {
        const skuId = normalizeSkuId(row?.sku_id);
        const supplierId = normalizeSkuId(row?.supplier_id);
        if (!skuId || !supplierId) continue;
        supplierSkuMap.set(`${supplierId}::${skuId}`, {
          supplier_sku: typeof row?.supplier_sku === "string" ? row.supplier_sku : null,
          cost_cents: typeof row?.cost_cents === "number" ? row.cost_cents : null,
          currency: typeof row?.currency === "string" ? row.currency : null,
        });
      }
    }

    const itemsBySupplier = new Map<string, any[]>();
    const supplierIds = new Set<string>();

    for (const item of resolvedItems) {
      const result = bestOffers.get(item.skuId);
      if (!result || !result.ok) continue;
      const picked: BestOfferSelection = result.selection;
      const supplierId = picked.supplierId;
      supplierIds.add(supplierId);
      const mapKey = `${supplierId}::${item.skuId}`;
      const skuMeta = supplierSkuMap.get(mapKey);
      const costCents =
        typeof picked.costCents === "number" ? picked.costCents : typeof skuMeta?.cost_cents === "number" ? skuMeta?.cost_cents : null;
      const currency = picked.currency || skuMeta?.currency || orderCurrency || null;

      const payload = {
        purchase_order_id: "",
        order_item_id: item.orderItemId,
        sku_id: item.skuId,
        qty: item.qty,
        supplier_offer_id: picked.offerId,
        cost_cents: costCents,
        currency,
        supplier_sku_snapshot: skuMeta?.supplier_sku ?? null,
        title_snapshot: item.title ?? null,
        metadata: {
          offer_id: picked.offerId,
          offer_price_cents: picked.priceCents,
          offer_currency: picked.currency,
          offer_lead_time_days: picked.leadTimeDays,
          availability_rank: picked.availabilityRank,
        },
      };
      const bucket = itemsBySupplier.get(supplierId) ?? [];
      bucket.push(payload);
      itemsBySupplier.set(supplierId, bucket);
    }

    for (const [supplierId, itemsPayload] of itemsBySupplier.entries()) {
      let totalCostCents = 0;
      let hasCost = false;
      let currency = orderCurrency ?? null;

      for (const item of itemsPayload) {
        if (typeof item.cost_cents === "number") {
          totalCostCents += item.cost_cents * item.qty;
          hasCost = true;
        }
        if (!currency && item.currency) currency = item.currency;
      }

      const { data: poInsert, error: poError } = await supabase
        .from("purchase_orders")
        .upsert(
          {
            order_id: orderId,
            supplier_id: supplierId,
            status: "pending",
            currency,
            total_cost_cents: hasCost ? totalCostCents : null,
          },
          { onConflict: "order_id,supplier_id", ignoreDuplicates: true }
        )
        .select("id")
        .maybeSingle<{ id: string }>();

      if (poError) {
        await recordWebhookLog({
          supabase,
          type: "dropship.po.create_failed",
          status: "error",
          eventId,
          message: poError.message || "purchase_orders_insert_failed",
          payload: { orderId, supplierId },
          error: poError,
        });
        continue;
      }

      let purchaseOrderId = poInsert?.id ?? null;
      if (!purchaseOrderId) {
        const { data: existingPo } = await supabase
          .from("purchase_orders")
          .select("id")
          .eq("order_id", orderId)
          .eq("supplier_id", supplierId)
          .maybeSingle<{ id: string }>();
        purchaseOrderId = existingPo?.id ?? null;
      }

      if (!purchaseOrderId) {
        await recordWebhookLog({
          supabase,
          type: "dropship.po.create_failed",
          status: "error",
          eventId,
          message: "purchase_order_missing_after_insert",
          payload: { orderId, supplierId },
        });
        continue;
      }

      const insertPayload = itemsPayload.map((item) => ({ ...item, purchase_order_id: purchaseOrderId! }));
      const { error: itemsInsertError } = await supabase
        .from("purchase_order_items")
        .upsert(insertPayload, { onConflict: "purchase_order_id,order_item_id", ignoreDuplicates: true });

      if (itemsInsertError) {
        await recordWebhookLog({
          supabase,
          type: "dropship.po.items_insert_failed",
          status: "error",
          eventId,
          message: itemsInsertError.message || "purchase_order_items_insert_failed",
          payload: { orderId, purchaseOrderId, supplierId },
          error: itemsInsertError,
        });
        continue;
      }

      await recordWebhookLog({
        supabase,
        type: "dropship.po.created",
        status: "info",
        eventId,
        message: "Purchase order created",
          payload: {
            orderId,
            purchaseOrderId,
            supplierId,
            items: itemsPayload.length,
            totalCostCents: hasCost ? totalCostCents : null,
            currency,
            suppliersDetected: Array.from(supplierIds),
          },
        });
    }
  } catch (error) {
    await recordWebhookLog({
      supabase,
      type: "dropship.po.create_failed",
      status: "error",
      eventId,
      message: "Unexpected PO creation error",
      payload: { orderId },
      error,
    });
  }
}
