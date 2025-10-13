import { beforeEach, describe, expect, it, vi } from "vitest";

const notifyPaymentMock = vi.fn();

vi.mock("@/app/api/payments/notify", () => ({
  notifyPayment: notifyPaymentMock,
}));

let supabaseMock: any;
const getAdminClientMock = vi.fn();

vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: getAdminClientMock,
}));

const ensureStripeMock = vi.fn();
const mapPaymentStatusMock = vi.fn();
const normalizeCurrencyMock = vi.fn();
const resolveOrderAmountMock = vi.fn();
const upsertPaymentRecordMock = vi.fn();
const updateOrderPaymentStateMock = vi.fn();
const mergeOrderMetadataMock = vi.fn((existing: any, patch: any) => ({
  ...(existing || {}),
  ...(patch || {}),
}));

vi.mock("@/app/api/payments/utils", () => ({
  ensureStripe: ensureStripeMock,
  mapPaymentStatus: mapPaymentStatusMock,
  normalizeCurrency: normalizeCurrencyMock,
  resolveOrderAmount: resolveOrderAmountMock,
  upsertPaymentRecord: upsertPaymentRecordMock,
  updateOrderPaymentState: updateOrderPaymentStateMock,
  mergeOrderMetadata: mergeOrderMetadataMock,
}));

type SupabaseOptions = {
  processedEventExisting?: boolean;
  processedSelectError?: { message: string } | null;
  processedInsertError?: { message: string } | null;
  orderRow?: any;
  orderError?: { message: string } | null;
  stripeUpdateError?: { message: string } | null;
  rpcError?: { message: string } | null;
  stripeInsertError?: { message: string } | null;
  webhookLogError?: { message: string } | null;
  paymentRefundRows?: any[];
  paymentRefundsError?: { message: string } | null;
};

function buildSupabase(options: SupabaseOptions = {}) {
  const processedMaybeSingle = vi.fn(async () => ({
    data: options.processedEventExisting ? { event_id: "evt_existing" } : null,
    error: options.processedSelectError ?? null,
  }));
  const processedEq = vi.fn(() => ({ maybeSingle: processedMaybeSingle }));
  const processedSelect = vi.fn(() => ({ eq: processedEq }));
  const processedInsert = vi.fn(async () => ({ error: options.processedInsertError ?? null }));

  const orderMaybeSingle = vi.fn(async () => ({
    data: options.orderRow ?? null,
    error: options.orderError ?? null,
  }));
  const orderEq = vi.fn(() => ({ maybeSingle: orderMaybeSingle }));
  const orderSelect = vi.fn(() => ({ eq: orderEq }));

  const webhookLogsInserted: any[] = [];
  const stripeWebhookInserts: any[] = [];

  const stripeUpdateEq = vi.fn(async () => ({ error: options.stripeUpdateError ?? null }));
  const stripeUpdate = vi.fn(() => ({ eq: stripeUpdateEq }));
  const stripeInsert = vi.fn(async (payload: any) => {
    stripeWebhookInserts.push(payload);
    return { error: options.stripeInsertError ?? null };
  });
  const stripeUpsert = vi.fn(async (payload: any) => {
    stripeWebhookInserts.push(payload);
    return { error: options.stripeInsertError ?? null };
  });

  const webhookLogInsert = vi.fn(async (payload: any) => {
    webhookLogsInserted.push(payload);
    return { error: options.webhookLogError ?? null };
  });

  const paymentRefundSelect = vi.fn(() => ({
    eq: vi.fn(async () => ({
      data: options.paymentRefundRows ?? [],
      error: options.paymentRefundsError ?? null,
    })),
  }));

  const rpc = vi.fn(async () => ({ error: options.rpcError ?? null }));

  const from = vi.fn((table: string) => {
    switch (table) {
      case "processed_events":
        return { select: processedSelect, insert: processedInsert };
      case "orders":
        return { select: orderSelect };
      case "stripe_webhooks":
        return { update: stripeUpdate, insert: stripeInsert, upsert: stripeUpsert };
      case "webhook_logs_app":
        return { insert: webhookLogInsert };
      case "payment_refunds":
        return { select: paymentRefundSelect };
      default:
        return {
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        };
    }
  });

  return {
    client: { from, rpc },
    spies: {
      processedSelect,
      processedEq,
      processedMaybeSingle,
      processedInsert,
      orderSelect,
      orderEq,
      orderMaybeSingle,
      stripeUpdate,
      stripeUpdateEq,
      stripeInsert,
      stripeUpsert,
      rpc,
      webhookLogInsert,
      webhookLogsInserted,
      stripeWebhookInserts,
    },
  };
}

function makeRequest(body: string, signature = "test_signature") {
  return new Request("http://localhost/api/payments/webhook", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": signature,
    },
  });
}

describe("POST /api/payments/webhook", () => {
  let stripeInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    stripeInstance = {
      webhooks: {
        constructEvent: vi.fn(),
      },
      paymentIntents: {
        retrieve: vi.fn(),
      },
    };
    ensureStripeMock.mockReturnValue(stripeInstance);
    mapPaymentStatusMock.mockImplementation((status: string) => {
      if (status === "succeeded") return "succeeded";
      if (status === "canceled") return "failed";
      if (status === "processing") return "processing";
      return status;
    });
    normalizeCurrencyMock.mockImplementation((value: string | null | undefined) =>
      (value || "").toLowerCase()
    );
    resolveOrderAmountMock.mockReset();
    resolveOrderAmountMock.mockResolvedValue({ amountCents: 1000, currency: "usd" });
    updateOrderPaymentStateMock.mockResolvedValue(null);
    upsertPaymentRecordMock.mockResolvedValue(undefined);
    getAdminClientMock.mockImplementation(() => supabaseMock);
  });

  it("returns 400 when Stripe signature is invalid", async () => {
    const supabase = buildSupabase();
    supabaseMock = supabase.client;
    stripeInstance.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const { POST } = await import("@/app/api/payments/webhook/route");
    const response = await POST(makeRequest("{}", "sig"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ ok: false, code: "invalid_signature" });
  });

  it("handles succeeded intent with amount mismatch and notifies desync", async () => {
    const orderId = "00000000-0000-4000-8000-000000000000";
    const rawPayload = JSON.stringify({ id: "evt_1" });
    const event = {
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_1",
          status: "succeeded",
          metadata: { order_id: orderId },
          amount_received: 4500,
          currency: "usd",
        },
      },
    } as const;
    stripeInstance.webhooks.constructEvent.mockImplementation((raw: string, signature: string, secret: string) => {
      expect(raw).toBe(rawPayload);
      expect(signature).toBe("sig_header");
      expect(secret).toBe("whsec_test");
      return event;
    });

    const orderRow = {
      id: orderId,
      user_id: "user-1",
      status: "pending",
      amount_cents: 5000,
      currency: "usd",
      payment_intent_id: "pi_old",
    };
    const supabase = buildSupabase({ orderRow });
    supabaseMock = supabase.client;
    resolveOrderAmountMock.mockResolvedValue({ amountCents: 5000, currency: "usd" });

    const { POST } = await import("@/app/api/payments/webhook/route");
    const response = await POST(makeRequest(rawPayload, "sig_header"));
   const body = await response.json();

   expect(response.status).toBe(200);
   expect(body).toEqual({ ok: true, mismatch: true, resolved_with: "stripe_amount" });
    expect(stripeInstance.paymentIntents.retrieve).toHaveBeenCalledWith(
      "pi_1",
      expect.objectContaining({ expand: expect.any(Array) })
    );
    expect(supabase.spies.stripeWebhookInserts.length).toBeGreaterThan(0);
    expect(updateOrderPaymentStateMock).toHaveBeenCalledWith(
      supabaseMock,
      orderId,
      expect.objectContaining({
        status: "succeeded",
        amount_cents: 4500,
        currency: "usd",
      }),
      expect.any(Object)
    );
    expect(upsertPaymentRecordMock).toHaveBeenCalledWith(
      supabaseMock,
      orderId,
      expect.objectContaining({ id: "pi_1" }),
      "usd",
      4500
    );
    expect(notifyPaymentMock).toHaveBeenCalledTimes(1);
    expect(notifyPaymentMock).toHaveBeenCalledWith(
      "desync",
      expect.objectContaining({
        orderId,
        amountCents: 4500,
        expectedAmountCents: 5000,
      })
    );
    expect(supabase.spies.stripeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        mismatch_reason: "amount_mismatch",
        stripe_amount_cents: 4500,
      })
    );
  });

  it("skips succeeded intent when order is missing and logs desync", async () => {
    const orderId = "00000000-0000-4000-8000-000000000123";
    const event = {
      id: "evt_missing_order",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_missing",
          status: "succeeded",
          metadata: { order_id: orderId },
          amount_received: 1500,
          currency: "usd",
        },
      },
    } as const;

    stripeInstance.webhooks.constructEvent.mockReturnValue(event);
    const supabase = buildSupabase({ orderRow: null });
    supabaseMock = supabase.client;

    const { POST } = await import("@/app/api/payments/webhook/route");
    const response = await POST(makeRequest(JSON.stringify({ id: "evt_missing_order" }), "sig"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, skipped: true });
    expect(notifyPaymentMock).toHaveBeenCalledWith(
      "desync",
      expect.objectContaining({
        orderId,
        reason: "order_not_found",
      })
    );
  });

  it("returns duplicate for already processed event", async () => {
    const event = {
      id: "evt_dup",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_dup",
          status: "succeeded",
          metadata: { order_id: "00000000-0000-4000-8000-000000000999" },
        },
      },
    } as const;

    stripeInstance.webhooks.constructEvent.mockReturnValue(event);
    const supabase = buildSupabase({ processedEventExisting: true });
    supabaseMock = supabase.client;

    const { POST } = await import("@/app/api/payments/webhook/route");
    const response = await POST(makeRequest(JSON.stringify({ id: "evt_dup" }), "sig"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, duplicate: true });
    expect(supabase.spies.stripeWebhookInserts.length).toBe(0);
  });

  it("processes charge.refunded and records refund notification", async () => {
    const orderId = "00000000-0000-4000-8000-000000000001";
    const rawPayload = JSON.stringify({ id: "evt_refund" });
    const charge = {
      id: "ch_1",
      amount_refunded: 2000,
      currency: "usd",
      payment_intent: "pi_2",
      metadata: { order_id: orderId },
      refunds: {
        data: [
          {
            id: "re_1",
            amount: 2000,
            currency: "usd",
            reason: "requested_by_customer",
          },
        ],
      },
    };
    const event = {
      id: "evt_refund",
      type: "charge.refunded",
      data: { object: charge },
    } as const;

    stripeInstance.webhooks.constructEvent.mockReturnValue(event);

    const orderRow = {
      id: orderId,
      user_id: "user-2",
      status: "paid",
      amount_cents: 2000,
      currency: "usd",
      payment_intent_id: "pi_2",
    };
    const supabase = buildSupabase({
      orderRow,
      paymentRefundRows: [{ amount_cents: 2000, currency: "usd", refund_id: "re_1" }],
    });
    supabaseMock = supabase.client;

    const { POST } = await import("@/app/api/payments/webhook/route");
    const response = await POST(makeRequest(rawPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      refunds_processed: 1,
      payment_status: "refunded",
      total_refunded_cents: 2000,
    });
    expect(supabase.spies.rpc).toHaveBeenCalledWith(
      "refund_order_apply",
      expect.objectContaining({
        p_order_id: orderId,
        p_refund_id: "re_1",
        p_amount_cents: 2000,
      })
    );
    expect(updateOrderPaymentStateMock).toHaveBeenCalledWith(
      supabaseMock,
      orderId,
      expect.objectContaining({
        payment_status: "refunded",
        status: "refunded",
        payment_intent_id: "pi_2",
        metadata_b: expect.objectContaining({
          refunds: expect.objectContaining({
            total_cents: 2000,
            last_refund_id: "re_1",
          }),
        }),
      }),
      expect.objectContaining({
        allowedStatuses: expect.arrayContaining(["paid", "refunded", "canceled", "cancelled", "failed"]),
      })
    );
    expect(notifyPaymentMock).toHaveBeenCalledTimes(1);
    expect(notifyPaymentMock).toHaveBeenCalledWith(
      "refunded",
      expect.objectContaining({
        orderId,
        refundId: "re_1",
        refundAmountCents: 2000,
      })
    );
  });

  it("handles partial refunds and keeps payment status consistent", async () => {
    const orderId = "00000000-0000-4000-8000-000000000010";
    const rawPayload = JSON.stringify({ id: "evt_partial" });
    const charge = {
      id: "ch_partial",
      amount_refunded: 800,
      currency: "usd",
      payment_intent: "pi_partial",
      metadata: { order_id: orderId },
      refunds: {
        data: [
          {
            id: "re_new",
            amount: 800,
            currency: "usd",
          },
        ],
      },
    };
    const event = {
      id: "evt_partial",
      type: "charge.refunded",
      data: { object: charge },
    } as const;

    stripeInstance.webhooks.constructEvent.mockReturnValue(event);

    const orderRow = {
      id: orderId,
      user_id: "user-3",
      status: "paid",
      amount_cents: 3000,
      currency: "usd",
      payment_intent_id: "pi_partial",
    };
    const supabase = buildSupabase({
      orderRow,
      paymentRefundRows: [
        { amount_cents: 1200, currency: "usd", refund_id: "re_old" },
        { amount_cents: 800, currency: "usd", refund_id: "re_new" },
      ],
    });
    supabaseMock = supabase.client;
    resolveOrderAmountMock.mockResolvedValue({ amountCents: 3000, currency: "usd" });

    const { POST } = await import("@/app/api/payments/webhook/route");
    const response = await POST(makeRequest(rawPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      refunds_processed: 1,
      payment_status: "partial_refund",
      total_refunded_cents: 2000,
    });
    expect(updateOrderPaymentStateMock).toHaveBeenCalledWith(
      supabaseMock,
      orderId,
      expect.objectContaining({
        payment_status: "partial_refund",
        metadata_b: expect.objectContaining({
          refunds: expect.objectContaining({ total_cents: 2000, count: 2 }),
        }),
      }),
      expect.objectContaining({
        allowedStatuses: expect.arrayContaining(["paid", "refunded", "canceled", "cancelled", "failed"]),
      })
    );
    expect(notifyPaymentMock).toHaveBeenCalledWith(
      "refunded",
      expect.objectContaining({
        orderId,
        amountCents: 800,
        notes: expect.arrayContaining([expect.stringContaining("Refunded")]),
      })
    );
  });

  it("updates order when intent requires action", async () => {
    const orderId = "00000000-0000-4000-8000-000000000020";
    const event = {
      id: "evt_requires_action",
      type: "payment_intent.requires_action",
      data: {
        object: {
          id: "pi_requires",
          status: "requires_action",
          metadata: { order_id: orderId },
          amount: 1800,
          currency: "usd",
          next_action: { type: "use_stripe_sdk" },
        },
      },
    } as const;

    stripeInstance.webhooks.constructEvent.mockReturnValue(event);
    const orderRow = {
      id: orderId,
      user_id: "user-4",
      status: "pending",
      amount_cents: 2000,
      currency: "usd",
      payment_intent_id: "pi_requires",
    };
    const supabase = buildSupabase({ orderRow });
    supabaseMock = supabase.client;
    resolveOrderAmountMock.mockResolvedValue({ amountCents: 2000, currency: "usd" });

    const { POST } = await import("@/app/api/payments/webhook/route");
    const response = await POST(makeRequest(JSON.stringify({ id: "evt_requires_action" }), "sig"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, requires_action: true });
    expect(updateOrderPaymentStateMock).toHaveBeenCalledWith(
      supabaseMock,
      orderId,
      expect.objectContaining({ payment_status: "requires_action" }),
      expect.any(Object)
    );
    expect(notifyPaymentMock).toHaveBeenCalledWith(
      "requires_action",
      expect.objectContaining({ orderId, reason: "use_stripe_sdk" })
    );
  });

  it("notifies failure reason on payment_intent.payment_failed", async () => {
    const orderId = "00000000-0000-4000-8000-000000000002";
    const rawPayload = JSON.stringify({ id: "evt_failed" });
    const event = {
      id: "evt_failed",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_failed",
          status: "requires_payment_method",
          amount: 1500,
          currency: "usd",
          metadata: { order_id: orderId },
          last_payment_error: { message: "Card declined" },
        },
      },
    } as const;
    stripeInstance.webhooks.constructEvent.mockReturnValue(event);

    const supabase = buildSupabase();
    supabaseMock = supabase.client;

    const { POST } = await import("@/app/api/payments/webhook/route");
    const response = await POST(makeRequest(rawPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(updateOrderPaymentStateMock).toHaveBeenCalledWith(
      supabaseMock,
      orderId,
      expect.objectContaining({
        status: "failed",
        payment_status: "requires_payment_method",
      }),
      expect.any(Object)
    );
    expect(upsertPaymentRecordMock).toHaveBeenCalledWith(
      supabaseMock,
      orderId,
      expect.objectContaining({ id: "pi_failed" }),
      "usd",
      1500
    );
    expect(notifyPaymentMock).toHaveBeenCalledTimes(1);
    expect(notifyPaymentMock).toHaveBeenCalledWith(
      "failed",
      expect.objectContaining({
        orderId,
        reason: "Card declined",
      })
    );
  });
});
