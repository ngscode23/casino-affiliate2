import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const markNotificationFlagMock = vi.fn(() => Promise.resolve());
const recordWebhookLogMock = vi.fn(() => Promise.resolve());
const getUserByIdMock = vi.fn(async () => ({
  data: { user: { email: "customer@example.com" } },
  error: null,
}));

vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({
    auth: { admin: { getUserById: getUserByIdMock } },
    from: vi.fn(),
  })),
}));

vi.mock("@/app/api/payments/observability", () => ({
  markNotificationFlag: markNotificationFlagMock,
  recordWebhookLog: recordWebhookLogMock,
}));

const originalEnv = { ...process.env };

describe("notifyPayment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.PAYMENTS_NOTIFY_PROVIDER = "postmark";
    process.env.PAYMENTS_NOTIFY_FROM = "alerts@example.com";
    process.env.PAYMENTS_NOTIFY_TO = "ops@example.com";
    process.env.POSTMARK_TOKEN = "token";
    process.env.PAYMENTS_NOTIFY_SEND_TO_USER = "0";
    globalThis.fetch = vi.fn(async () => new Response("", { status: 200 })) as unknown as typeof fetch;
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    // @ts-expect-error cleanup mock fetch
    delete globalThis.fetch;
  });

  it("sends postmark request with expected payload", async () => {
    const { notifyPayment } = await import("@/app/api/payments/notify");
    await notifyPayment("succeeded", {
      orderId: "order-1",
      amountCents: 1000,
      currency: "usd",
      paymentIntentId: "pi_123",
      webhookEventId: "evt_123",
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, requestInit] = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(requestInit.body);
    expect(body.Subject).toBe("Payment succeeded - Order order-1");
    expect(body.HtmlBody).toContain("Payment succeeded");
    expect(body.HtmlBody).toContain("Amount: <b>10.00 USD</b>");
    expect(body.To).toBe("ops@example.com");
    expect(markNotificationFlagMock).toHaveBeenCalledWith("evt_123", "notified_succeeded");
    expect(recordWebhookLogMock).not.toHaveBeenCalled();
  });

  it("logs failure when provider request fails", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("error", { status: 500, statusText: "Internal Server Error" })
    ) as unknown as typeof fetch;

    const { notifyPayment } = await import("@/app/api/payments/notify");
    await notifyPayment("failed", {
      orderId: "order-2",
      amountCents: 1500,
      currency: "usd",
      webhookEventId: "evt_fail",
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(markNotificationFlagMock).not.toHaveBeenCalled();
    expect(recordWebhookLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "payments.notify.error",
        status: "error",
        eventId: "evt_fail",
        source: "payments.notify",
        message: "postmark 500: error",
        payload: expect.objectContaining({
          orderId: "order-2",
          provider: "postmark",
          webhookEventId: "evt_fail",
        }),
      })
    );
  });
});
