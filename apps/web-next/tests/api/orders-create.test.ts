import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthMock = vi.fn(async () => ({
  user: { id: "user-1", email: "buyer@example.com" },
  accessToken: "token",
  rawUser: {} as any,
}));

vi.mock("@/utils/auth/guard", () => ({
  requireAuth: requireAuthMock,
}));

const applyPromotionsToOrderMock = vi.fn(async () => undefined);
vi.mock("@/lib/promotions/apply", () => ({
  applyPromotionsToOrder: applyPromotionsToOrderMock,
}));

let supabaseMock: any;
const getAdminClientMock = vi.fn(() => supabaseMock);
vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: getAdminClientMock,
}));

function buildSupabase(options: { skuRow?: any; catalogRow?: any } = {}) {
  let ordersInsertPayload: any = null;
  let orderItemsInsertPayload: any = null;

  const ordersSelectIs = vi.fn(async () => ({ count: 0, error: null }));
  const ordersSelect = vi.fn(() => ({ is: ordersSelectIs }));

  const ordersInsertMaybeSingle = vi.fn(async () => ({ data: { id: "order-1" }, error: null }));
  const ordersInsertSelect = vi.fn(() => ({ maybeSingle: ordersInsertMaybeSingle }));
  const ordersInsert = vi.fn((payload: any) => {
    ordersInsertPayload = payload;
    return { select: ordersInsertSelect };
  });

  const ecomProductsSelectIn = vi.fn(async () => ({
    data: options.skuRow ? [options.skuRow] : [],
    error: null,
  }));
  const ecomProductsSelect = vi.fn(() => ({ in: ecomProductsSelectIn }));

  const catalogSelectIn = vi.fn(async () => ({
    data: options.catalogRow ? [options.catalogRow] : [],
    error: null,
  }));
  const catalogSelect = vi.fn(() => ({ in: catalogSelectIn }));

  const orderItemsInsert = vi.fn(async (payload: any) => {
    orderItemsInsertPayload = payload;
    return { error: null };
  });
  const orderItemsSelectEq = vi.fn(async () => ({ data: [], error: null }));
  const orderItemsSelect = vi.fn(() => ({ eq: orderItemsSelectEq }));

  const userEventsInsert = vi.fn(async () => ({ error: null }));

  const from = vi.fn((table: string) => {
    switch (table) {
      case "orders":
        return { select: ordersSelect, insert: ordersInsert };
      case "ecom_products":
        return { select: ecomProductsSelect };
      case "catalog_products_v":
        return { select: catalogSelect };
      case "order_items":
        return { insert: orderItemsInsert, select: orderItemsSelect };
      case "user_events":
        return { insert: userEventsInsert };
      default:
        return {};
    }
  });

  return {
    from,
    ordersSelectIs,
    ordersInsert,
    getOrdersInsertPayload: () => ordersInsertPayload,
    orderItemsInsert,
    getOrderItemsInsertPayload: () => orderItemsInsertPayload,
  };
}

describe("POST /api/orders-create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty_order when no items are provided", async () => {
    supabaseMock = buildSupabase();

    const { POST } = await import("@/app/api/orders-create/route");
    const response = await POST(
      new Request("http://localhost/api/orders-create", {
        method: "POST",
        body: JSON.stringify({ items: [] }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, code: "empty_order" });
  });

  it("creates an order and inserts items", async () => {
    const skuId = "11111111-1111-4000-8000-111111111111";
    const catalogId = "22222222-2222-4000-8000-222222222222";
    supabaseMock = buildSupabase({
      skuRow: {
        id: skuId,
        slug: "sku-1",
        title: "SKU 1",
        price: 12,
        price_cents: 1200,
        currency: "USD",
        status: "active",
        is_available: true,
        inventory_status: "in_stock",
        catalog_product_id: catalogId,
      },
      catalogRow: {
        id: catalogId,
        status: "published",
        brand_slug: null,
        brand_name: null,
        category_slug: null,
        category_title: null,
      },
    });

    const { POST } = await import("@/app/api/orders-create/route");
    const response = await POST(
      new Request("http://localhost/api/orders-create", {
        method: "POST",
        body: JSON.stringify({
          items: [{ id: skuId, qty: 2 }],
          currency: "USD",
          checkout: {
            contact: { fullName: "Test User", email: "buyer@example.com" },
            shipping: { address: "123 Test St", city: "Riga", postalCode: "LV-1001" },
          },
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, order_id: "order-1" });

    expect(supabaseMock.ordersInsert).toHaveBeenCalledTimes(1);
    const orderPayload = supabaseMock.getOrdersInsertPayload();
    expect(orderPayload).toMatchObject({
      currency: "USD",
      status: "pending",
      payment_status: "pending",
    });
    expect(orderPayload.checkout_metadata?.contact_email).toBe("buyer@example.com");

    expect(supabaseMock.orderItemsInsert).toHaveBeenCalledTimes(1);
    const itemsPayload = supabaseMock.getOrderItemsInsertPayload();
    expect(Array.isArray(itemsPayload)).toBe(true);
    expect(itemsPayload?.[0]).toMatchObject({
      order_id: "order-1",
      product_id: skuId,
      qty: 2,
    });
  });
});
