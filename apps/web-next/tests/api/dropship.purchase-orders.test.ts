import { beforeEach, describe, expect, it, vi } from "vitest";

const recordWebhookLogMock = vi.fn(async () => undefined);
vi.mock("@/app/api/payments/observability", () => ({
  recordWebhookLog: recordWebhookLogMock,
}));

const resolveOffersForSkusMock = vi.fn();
vi.mock("@/lib/pricing-inventory", () => ({
  resolveOffersForSkus: resolveOffersForSkusMock,
}));

function buildSupabase(options: {
  orderItems: any[];
  supplierSkuRows?: any[];
  purchaseOrderId?: string;
}) {
  const orderItemsSelectEq = vi.fn(async () => ({ data: options.orderItems, error: null }));
  const orderItemsSelect = vi.fn(() => ({ eq: orderItemsSelectEq }));

  const supplierSkusSelectIn = vi.fn(async () => ({ data: options.supplierSkuRows ?? [], error: null }));
  const supplierSkusSelect = vi.fn(() => ({ in: supplierSkusSelectIn }));

  const purchaseOrdersUpsertMaybeSingle = vi.fn(async () => ({
    data: { id: options.purchaseOrderId ?? "po-1" },
    error: null,
  }));
  const purchaseOrdersUpsertSelect = vi.fn(() => ({ maybeSingle: purchaseOrdersUpsertMaybeSingle }));
  const purchaseOrdersUpsert = vi.fn(() => ({ select: purchaseOrdersUpsertSelect }));

  let purchaseOrderItemsPayload: any = null;
  const purchaseOrderItemsUpsert = vi.fn(async (payload: any) => {
    purchaseOrderItemsPayload = payload;
    return { error: null };
  });

  const from = vi.fn((table: string) => {
    switch (table) {
      case "order_items":
        return { select: orderItemsSelect };
      case "supplier_skus":
        return { select: supplierSkusSelect };
      case "purchase_orders":
        return { upsert: purchaseOrdersUpsert };
      case "purchase_order_items":
        return { upsert: purchaseOrderItemsUpsert };
      default:
        return {};
    }
  });

  return {
    from,
    purchaseOrdersUpsert,
    purchaseOrderItemsUpsert,
    getPurchaseOrderItemsPayload: () => purchaseOrderItemsPayload,
  };
}

describe("createPurchaseOrderForPaidOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs empty order and exits when no items exist", async () => {
    const supabase = buildSupabase({ orderItems: [] });
    const { createPurchaseOrderForPaidOrder } = await import("@/app/api/dropship/purchase-orders");

    await createPurchaseOrderForPaidOrder({
      supabase: supabase as any,
      orderId: "order-1",
      eventId: "evt-1",
      orderCurrency: "USD",
    });

    expect(recordWebhookLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "dropship.po.empty_order" }),
    );
    expect(supabase.purchaseOrdersUpsert).not.toHaveBeenCalled();
  });

  it("creates PO items with selected offer snapshot", async () => {
    const skuId = "11111111-1111-4000-8000-111111111111";
    const supplierId = "22222222-2222-4000-8000-222222222222";
    const offerId = "offer-1";
    const supabase = buildSupabase({
      orderItems: [{ id: "item-1", product_id: skuId, qty: 2, meta: { sku_id: skuId }, title: "Item 1" }],
      supplierSkuRows: [{ supplier_id: supplierId, sku_id: skuId, supplier_sku: "SUP-1", cost_cents: 900, currency: "USD" }],
      purchaseOrderId: "po-1",
    });

    const bestOffers = new Map();
    bestOffers.set(skuId, {
      ok: true,
      selection: {
        skuId,
        supplierId,
        offerId,
        supplierSkuId: null,
        priceCents: 1200,
        currency: "USD",
        costCents: 900,
        leadTimeDays: 2,
        availabilityRank: 0,
        stockQuantity: 5,
        isAvailable: true,
        inventoryStatus: "in_stock",
        lastSyncedAt: null,
      },
    });
    resolveOffersForSkusMock.mockResolvedValue(bestOffers);

    const { createPurchaseOrderForPaidOrder } = await import("@/app/api/dropship/purchase-orders");

    await createPurchaseOrderForPaidOrder({
      supabase: supabase as any,
      orderId: "order-1",
      eventId: "evt-1",
      orderCurrency: "USD",
    });

    expect(supabase.purchaseOrdersUpsert).toHaveBeenCalledTimes(1);
    expect(supabase.purchaseOrderItemsUpsert).toHaveBeenCalledTimes(1);
    const itemsPayload = supabase.getPurchaseOrderItemsPayload();
    expect(itemsPayload?.[0]).toMatchObject({
      purchase_order_id: "po-1",
      sku_id: skuId,
      supplier_offer_id: offerId,
    });
    expect(itemsPayload?.[0]?.metadata).toMatchObject({
      offer_id: offerId,
      offer_price_cents: 1200,
      offer_currency: "USD",
    });
    expect(recordWebhookLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "dropship.po.created" }),
    );
  });
});
