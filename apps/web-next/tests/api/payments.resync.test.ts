
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateOrderPaymentStateMock = vi.fn();
const resolveOrderAmountMock = vi.fn();
const upsertPaymentRecordMock = vi.fn();
const emitPaymentMetricMock = vi.fn();
const recordWebhookLogMock = vi.fn();

const ensureStripeMock = vi.fn();
const mapPaymentStatusMock = vi.fn((status: string) => status);
const normalizeCurrencyMock = vi.fn((currency: string | null | undefined) => (currency || "").toLowerCase());
const mergeOrderMetadataMock = vi.fn((existing: any, patch: any) => ({ ...(existing || {}), ...patch }));

vi.mock("@/app/api/payments/utils", () => ({
  ensureStripe: ensureStripeMock,
  mapPaymentStatus: mapPaymentStatusMock,
  mergeOrderMetadata: mergeOrderMetadataMock,
  normalizeCurrency: normalizeCurrencyMock,
  resolveOrderAmount: resolveOrderAmountMock,
  upsertPaymentRecord: upsertPaymentRecordMock,
  updateOrderPaymentState: updateOrderPaymentStateMock,
}));

vi.mock("@/app/api/payments/observability", () => ({
  emitPaymentMetric: emitPaymentMetricMock,
  recordWebhookLog: recordWebhookLogMock,
}));

const getAdminClientMock = vi.fn();

vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: getAdminClientMock,
}));

const requireAdminMock = vi.fn(async () => ({}));

vi.mock("@/utils/auth/guard", () => ({
  requireAdmin: requireAdminMock,
}));

function buildSupabase(orderRow: any) {
  const maybeSingle = vi.fn(async () => ({ data: orderRow, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({
    eq,
    limit: vi.fn(() => ({ eq })),
  }));
  const from = vi.fn(() => ({ select }));
  return { from };
}

describe("POST /api/payments/resync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_TOKEN = "secret";
    ensureStripeMock.mockReturnValue({
      paymentIntents: {
        retrieve: vi.fn(async (intentId: string) => ({
          id: intentId,
          status: "succeeded",
          amount_received: 2200,
          currency: "usd",
          created: 1_700_000_000,
        })),
      },
    });
    resolveOrderAmountMock.mockResolvedValue({ amountCents: 2000, currency: "usd" });
    updateOrderPaymentStateMock.mockResolvedValue(null);
    upsertPaymentRecordMock.mockResolvedValue(undefined);
  });

  it("rescans payment intent and updates order", async () => {
    const order = {
      id: "order-1",
      user_id: "user",
      status: "pending",
      amount_cents: 2000,
      currency: "usd",
      payment_intent_id: "pi_resync",
    };
    const supabase = buildSupabase(order);
    getAdminClientMock.mockReturnValue(supabase);

    const { POST } = await import("@/app/api/payments/resync/route");
    const response = await POST(
      new Request("http://localhost/api/payments/resync", {
        method: "POST",
        body: JSON.stringify({ order_id: order.id }),
        headers: { "x-admin-token": "secret" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      order_id: order.id,
      payment_status: "succeeded",
      amount_cents: 2200,
      currency: "usd",
    });
    expect(updateOrderPaymentStateMock).toHaveBeenCalled();
    expect(upsertPaymentRecordMock).toHaveBeenCalledWith(
      supabase,
      order.id,
      expect.objectContaining({ id: "pi_resync" }),
      "usd",
      2200
    );
    expect(emitPaymentMetricMock).toHaveBeenCalledWith(
      "payments.resync.completed",
      expect.objectContaining({ orderId: order.id, paymentStatus: "succeeded" })
    );
  });

  it("returns 400 when payment intent id missing", async () => {
    const order = {
      id: "order-2",
      user_id: "user",
      status: "pending",
      amount_cents: 0,
      currency: "usd",
      payment_intent_id: null,
    };
    const supabase = buildSupabase(order);
    getAdminClientMock.mockReturnValue(supabase);

    const { POST } = await import("@/app/api/payments/resync/route");
    const response = await POST(
      new Request("http://localhost/api/payments/resync", {
        method: "POST",
        body: JSON.stringify({ order_id: order.id }),
        headers: { "x-admin-token": "secret" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ ok: false, code: "bad_request" });
  });
});
