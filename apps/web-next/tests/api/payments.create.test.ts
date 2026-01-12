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
  supplierSkus: any[];
}) {
  const ordersMaybeSingle = vi.fn(async () => ({ data: options.orderRow, error: null }));
  const ordersEq = vi.fn(() => ({ maybeSingle: ordersMaybeSingle }));
  const ordersSelect = vi.fn(() => ({ eq: ordersEq }));

  const orderItemsEq = vi.fn(async () => ({ data: options.orderItems, error: null }));
  const orderItemsSelect = vi.fn(() => ({ eq: orderItemsEq }));

  const supplierSkusIn = vi.fn(async () => ({ data: options.supplierSkus, error: null }));
  const supplierSkusSelect = vi.fn(() => ({ in: supplierSkusIn }));

  const from = vi.fn((table: string) => {
    switch (table) {
      case "orders":
        return { select: ordersSelect };
      case "order_items":
        return { select: orderItemsSelect };
      case "supplier_skus":
        return { select: supplierSkusSelect };
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
  });

  it("blocks payment when supplier mapping is missing", async () => {
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
      supplierSkus: [],
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
      reason: "missing_supplier_skus",
    });
    expect(body.sku_ids).toEqual([skuId]);
    expect(resolveOrderAmountMock).not.toHaveBeenCalled();
    expect(ensureStripeMock).not.toHaveBeenCalled();
  });
});

