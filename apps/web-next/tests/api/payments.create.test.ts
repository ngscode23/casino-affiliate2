import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureStripeMock = vi.fn();
const mapPaymentStatusMock = vi.fn((status: string) => status);
const normalizeCurrencyMock = vi.fn((currency: string | null | undefined) => (currency || "").toLowerCase());
const resolveOrderAmountMock = vi.fn();
const upsertPaymentRecordMock = vi.fn();
const updateOrderPaymentStateMock = vi.fn();

vi.mock("@/app/api/payments/utils", () => ({
  ensureStripe: ensureStripeMock,
  mapPaymentStatus: mapPaymentStatusMock,
  normalizeCurrency: normalizeCurrencyMock,
  resolveOrderAmount: resolveOrderAmountMock,
  upsertPaymentRecord: upsertPaymentRecordMock,
  updateOrderPaymentState: updateOrderPaymentStateMock,
}));

const requireAuthMock = vi.fn(async () => ({
  user: { id: "user-1" },
  accessToken: "token",
  rawUser: {} as any,
}));

vi.mock("@/utils/auth/guard", () => ({
  requireAuth: requireAuthMock,
}));

const getAdminClientMock = vi.fn();

vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: getAdminClientMock,
}));

function buildSupabase(options: {
  orderRow: any;
  orderItems: any[];
  supplierOffers: any[];
  supplierInventory: any[];
}) {
  const paymentsMaybeSingle = vi.fn(async () => ({ data: null, error: null }));
  const paymentsLimit = vi.fn(() => ({ maybeSingle: paymentsMaybeSingle }));
  const paymentsOrder = vi.fn(() => ({ limit: paymentsLimit }));
  const paymentsEqSecond = vi.fn(() => ({ order: paymentsOrder }));
  const paymentsEqFirst = vi.fn(() => ({ eq: paymentsEqSecond }));
  const paymentsSelect = vi.fn(() => ({ eq: paymentsEqFirst }));

  const ordersMaybeSingle = vi.fn(async () => ({ data: options.orderRow, error: null }));
  const ordersEq = vi.fn(() => ({ maybeSingle: ordersMaybeSingle }));
  const ordersSelect = vi.fn(() => ({ eq: ordersEq }));

  const orderItemsEq = vi.fn(async () => ({ data: options.orderItems, error: null }));
  const orderItemsSelect = vi.fn(() => ({ eq: orderItemsEq }));

  const supplierOffersOr = vi.fn(async () => ({ data: options.supplierOffers, error: null }));
  const supplierOffersEq = vi.fn(() => ({ or: supplierOffersOr }));
  const supplierOffersIn = vi.fn(() => ({ eq: supplierOffersEq }));
  const supplierOffersSelect = vi.fn(() => ({ in: supplierOffersIn }));

  const supplierInventoryIn = vi.fn(async () => ({ data: options.supplierInventory, error: null }));
  const supplierInventorySelect = vi.fn(() => ({ in: supplierInventoryIn }));

  const from = vi.fn((table: string) => {
    switch (table) {
      case "orders":
        return { select: ordersSelect };
      case "order_items":
        return { select: orderItemsSelect };
      case "payments":
        return { select: paymentsSelect };
      case "supplier_offers":
        return { select: supplierOffersSelect };
      case "supplier_inventory_levels":
        return { select: supplierInventorySelect };
      default:
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        };
    }
  });

  return { from };
}

describe("POST /api/payments/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveOrderAmountMock.mockResolvedValue({ amountCents: 1000, currency: "usd" });
    updateOrderPaymentStateMock.mockResolvedValue(null);
  });

  it("blocks payment when offers are unavailable", async () => {
    const orderId = "00000000-0000-4000-8000-000000000000";
    const skuId = "11111111-1111-4000-8000-111111111111";
    const orderRow = {
      id: orderId,
      user_id: "user-1",
      status: "pending",
      amount_cents: 1000,
      currency: "usd",
      payment_intent_id: null,
      paid_at: null,
    };

    const supabase = buildSupabase({
      orderRow,
      orderItems: [{ id: "item-1", product_id: skuId, qty: 1, meta: { sku_id: skuId } }],
      supplierOffers: [],
      supplierInventory: [],
    });
    getAdminClientMock.mockReturnValue(supabase);

    const { POST } = await import("@/app/api/payments/create/route");
    const response = await POST(
      new Request("http://localhost/api/payments/create", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      ok: false,
      code: "not_fulfillable",
      reason: "offer_unavailable",
    });
    expect(body.sku_ids).toEqual([skuId]);
    expect(resolveOrderAmountMock).not.toHaveBeenCalled();
    expect(ensureStripeMock).not.toHaveBeenCalled();
  });

  it("blocks payment when inventory is missing", async () => {
    const orderId = "00000000-0000-4000-8000-000000000001";
    const skuId = "22222222-2222-4000-8000-222222222222";
    const orderRow = {
      id: orderId,
      user_id: "user-1",
      status: "pending",
      amount_cents: 1000,
      currency: "usd",
      payment_intent_id: null,
      paid_at: null,
    };

    const supabase = buildSupabase({
      orderRow,
      orderItems: [{ id: "item-1", product_id: skuId, qty: 1, meta: { sku_id: skuId } }],
      supplierOffers: [
        {
          id: "offer-1",
          supplier_id: "supplier-1",
          sku_id: skuId,
          supplier_sku_id: "ssku-1",
          price_cents: 1200,
          currency: "USD",
          cost_cents: 900,
          lead_time_days: 2,
        },
      ],
      supplierInventory: [],
    });
    getAdminClientMock.mockReturnValue(supabase);

    const { POST } = await import("@/app/api/payments/create/route");
    const response = await POST(
      new Request("http://localhost/api/payments/create", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      ok: false,
      code: "not_fulfillable",
      reason: "inventory_missing",
    });
    expect(body.sku_ids).toEqual([skuId]);
    expect(resolveOrderAmountMock).not.toHaveBeenCalled();
    expect(ensureStripeMock).not.toHaveBeenCalled();
  });

  it("blocks payment when inventory is out of stock", async () => {
    const orderId = "00000000-0000-4000-8000-000000000002";
    const skuId = "33333333-3333-4000-8000-333333333333";
    const orderRow = {
      id: orderId,
      user_id: "user-1",
      status: "pending",
      amount_cents: 1000,
      currency: "usd",
      payment_intent_id: null,
      paid_at: null,
    };

    const supabase = buildSupabase({
      orderRow,
      orderItems: [{ id: "item-1", product_id: skuId, qty: 1, meta: { sku_id: skuId } }],
      supplierOffers: [
        {
          id: "offer-2",
          supplier_id: "supplier-1",
          sku_id: skuId,
          supplier_sku_id: "ssku-2",
          price_cents: 1500,
          currency: "USD",
          cost_cents: 1000,
          lead_time_days: 3,
        },
      ],
      supplierInventory: [
        {
          supplier_id: "supplier-1",
          sku_id: skuId,
          is_available: true,
          inventory_status: "out_of_stock",
          stock_quantity: 0,
        },
      ],
    });
    getAdminClientMock.mockReturnValue(supabase);

    const { POST } = await import("@/app/api/payments/create/route");
    const response = await POST(
      new Request("http://localhost/api/payments/create", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      ok: false,
      code: "not_fulfillable",
      reason: "out_of_stock",
    });
    expect(body.sku_ids).toEqual([skuId]);
    expect(resolveOrderAmountMock).not.toHaveBeenCalled();
    expect(ensureStripeMock).not.toHaveBeenCalled();
  });

  it("blocks payment when offer data is invalid", async () => {
    const orderId = "00000000-0000-4000-8000-000000000003";
    const skuId = "44444444-4444-4000-8000-444444444444";
    const orderRow = {
      id: orderId,
      user_id: "user-1",
      status: "pending",
      amount_cents: 1000,
      currency: "usd",
      payment_intent_id: null,
      paid_at: null,
    };

    const supabase = buildSupabase({
      orderRow,
      orderItems: [{ id: "item-1", product_id: skuId, qty: 1, meta: { sku_id: skuId } }],
      supplierOffers: [
        {
          id: "offer-3",
          supplier_id: "supplier-1",
          sku_id: skuId,
          supplier_sku_id: "ssku-3",
          price_cents: null,
          currency: "USD",
        },
      ],
      supplierInventory: [
        {
          supplier_id: "supplier-1",
          sku_id: skuId,
          is_available: true,
          inventory_status: "in_stock",
          stock_quantity: 5,
        },
      ],
    });
    getAdminClientMock.mockReturnValue(supabase);

    const { POST } = await import("@/app/api/payments/create/route");
    const response = await POST(
      new Request("http://localhost/api/payments/create", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      ok: false,
      code: "not_fulfillable",
      reason: "offer_unavailable",
    });
    expect(body.sku_ids).toEqual([skuId]);
    expect(resolveOrderAmountMock).not.toHaveBeenCalled();
    expect(ensureStripeMock).not.toHaveBeenCalled();
  });

  it("allows payment when offer and inventory are valid", async () => {
    const orderId = "00000000-0000-4000-8000-000000000004";
    const skuId = "55555555-5555-4000-8000-555555555555";
    const orderRow = {
      id: orderId,
      user_id: "user-1",
      status: "pending",
      amount_cents: 1000,
      currency: "usd",
      payment_intent_id: null,
      paid_at: null,
    };

    const stripeCreate = vi.fn(async () => ({
      id: "pi_123",
      status: "requires_payment_method",
      client_secret: "secret_123",
    }));
    const stripeRetrieve = vi.fn();
    ensureStripeMock.mockReturnValue({
      paymentIntents: { create: stripeCreate, retrieve: stripeRetrieve },
    });

    const supabase = buildSupabase({
      orderRow,
      orderItems: [{ id: "item-1", product_id: skuId, qty: 1, meta: { sku_id: skuId } }],
      supplierOffers: [
        {
          id: "offer-4",
          supplier_id: "supplier-1",
          sku_id: skuId,
          supplier_sku_id: "ssku-4",
          price_cents: 1500,
          currency: "USD",
          cost_cents: 1000,
          lead_time_days: 2,
        },
      ],
      supplierInventory: [
        {
          supplier_id: "supplier-1",
          sku_id: skuId,
          is_available: true,
          inventory_status: "in_stock",
          stock_quantity: 10,
        },
      ],
    });
    getAdminClientMock.mockReturnValue(supabase);

    const { POST } = await import("@/app/api/payments/create/route");
    const response = await POST(
      new Request("http://localhost/api/payments/create", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      order_id: orderId,
      client_secret: "secret_123",
    });
    expect(stripeCreate).toHaveBeenCalled();
  });
});
