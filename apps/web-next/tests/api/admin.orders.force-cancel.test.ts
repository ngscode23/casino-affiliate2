import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const getAdminClientMock = vi.fn();
const mergeOrderMetadataMock = vi.fn();
const recordWebhookLogMock = vi.fn();
const notifyForceCancelMock = vi.fn();
const resetOrdersCacheMock = vi.fn();

vi.mock("@/utils/auth/guard", () => ({
  requireAdmin: (...args: unknown[]) => requireAdminMock(...args),
}));

vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: (...args: unknown[]) => getAdminClientMock(...args),
}));

vi.mock("@/app/api/payments/utils", () => ({
  mergeOrderMetadata: (...args: unknown[]) => mergeOrderMetadataMock(...args),
}));

vi.mock("@/app/api/payments/observability", () => ({
  recordWebhookLog: (...args: unknown[]) => recordWebhookLogMock(...args),
}));

vi.mock("@/app/api/payments/notify", () => ({
  notifyForceCancel: (...args: unknown[]) => notifyForceCancelMock(...args),
}));

vi.mock("@shared/sdk/ordersClient", () => ({
  resetOrdersCache: (...args: unknown[]) => resetOrdersCacheMock(...args),
}));

function createSupabaseMock(orderRow: Record<string, unknown>, historyRow: Record<string, unknown>) {
  let ordersUpdatePayload: Record<string, unknown> | null = null;
  let ordersUpdateArgs: unknown[] | null = null;
  const ordersTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: orderRow, error: null })),
      })),
    })),
    update: vi.fn((payload: Record<string, unknown>) => {
      ordersUpdatePayload = payload;
      return {
        eq: vi.fn(async (...args: unknown[]) => {
          ordersUpdateArgs = args;
          return { error: null };
        }),
      };
    }),
  };

  let paymentsUpdatePayload: Record<string, unknown> | null = null;
  let paymentsUpdateArgs: unknown[] | null = null;
  const paymentsTable = {
    update: vi.fn((payload: Record<string, unknown>) => {
      paymentsUpdatePayload = payload;
      return {
        eq: vi.fn(async (...args: unknown[]) => {
          paymentsUpdateArgs = args;
          return { error: null };
        }),
      };
    }),
  };

  let historyUpdatePayload: Record<string, unknown> | null = null;
  let historyUpdateArgs: unknown[] | null = null;
  const historyTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: historyRow, error: null })),
          })),
        })),
      })),
    })),
    update: vi.fn((payload: Record<string, unknown>) => {
      historyUpdatePayload = payload;
      return {
        eq: vi.fn(async (...args: unknown[]) => {
          historyUpdateArgs = args;
          return { error: null };
        }),
      };
    }),
  };

  let processedInsertArgs: unknown = null;
  const processedTable = {
    insert: vi.fn(async (payload: unknown) => {
      processedInsertArgs = payload;
      return { error: null };
    }),
  };

  const fromMock = vi.fn((table: string) => {
    switch (table) {
      case "orders":
        return ordersTable;
      case "payments":
        return paymentsTable;
      case "order_status_history":
        return historyTable;
      case "processed_events":
        return processedTable;
      default:
        return {} as any;
    }
  });

  return {
    client: { from: fromMock },
    ordersTable,
    paymentsTable,
    historyTable,
    processedTable,
    getOrdersUpdatePayload: () => ordersUpdatePayload,
    getOrdersUpdateArgs: () => ordersUpdateArgs,
    getPaymentsUpdatePayload: () => paymentsUpdatePayload,
    getPaymentsUpdateArgs: () => paymentsUpdateArgs,
    getHistoryUpdatePayload: () => historyUpdatePayload,
    getHistoryUpdateArgs: () => historyUpdateArgs,
    getProcessedInsertArgs: () => processedInsertArgs,
  };
}

describe("POST /api/admin/orders/[orderId]/force-cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.ADMIN_TOKEN = "secret";
    mergeOrderMetadataMock.mockImplementation((existing, patch) => ({ ...(existing || {}), ...(patch || {}) }));
    recordWebhookLogMock.mockResolvedValue(undefined);
    notifyForceCancelMock.mockResolvedValue(undefined);
    resetOrdersCacheMock.mockReturnValue(undefined);
  });

  it("returns 401 when admin token missing and auth fails", async () => {
    requireAdminMock.mockResolvedValue({
      response: new Response("unauthorized", { status: 401 }),
    });
    const orderRow = {
      id: "order-1",
      user_id: "user-1",
      status: "pending",
      payment_status: "pending",
      payment_intent_id: "pi_test",
      metadata_b: null,
      amount_cents: 2500,
      currency: "usd",
    };
    const supabaseMock = createSupabaseMock(orderRow, { id: "hist-1", reason: null, changed_by: null });
    getAdminClientMock.mockReturnValue(supabaseMock.client);

    const { POST } = await import("@/app/api/admin/orders/[orderId]/force-cancel/route");

    const response = await POST(
      new Request("http://localhost/api/admin/orders/order-1/force-cancel", { method: "POST" }),
      { params: Promise.resolve({ orderId: "order-1" }) },
    );

    expect(response.status).toBe(401);
    expect(supabaseMock.ordersTable.update).not.toHaveBeenCalled();
    expect(notifyForceCancelMock).not.toHaveBeenCalled();
  });

  it("force-cancels order when authorized via token", async () => {
    requireAdminMock.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@example.com",
      },
    });

    const orderRow = {
      id: "order-2",
      user_id: "user-2",
      status: "pending",
      payment_status: "processing",
      payment_intent_id: "pi_manual",
      metadata_b: { existing: true },
      amount_cents: 4800,
      currency: "eur",
    };
    const historyRow = { id: "hist-22", reason: null, changed_by: null };
    const supabaseMock = createSupabaseMock(orderRow, historyRow);
    getAdminClientMock.mockReturnValue(supabaseMock.client);

    const { POST } = await import("@/app/api/admin/orders/[orderId]/force-cancel/route");

    const response = await POST(
      new Request("http://localhost/api/admin/orders/order-2/force-cancel", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": "secret",
        },
        body: JSON.stringify({ reason: "manual review" }),
      }),
      { params: Promise.resolve({ orderId: "order-2" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, admin_cancelled: true, order_id: "order-2" });

    expect(supabaseMock.ordersTable.update).toHaveBeenCalled();
    expect(supabaseMock.getOrdersUpdatePayload()).toMatchObject({
      status: "cancelled",
      payment_status: "cancelled",
    });
    expect(supabaseMock.getOrdersUpdateArgs()).toEqual(["id", "order-2"]);

    expect(supabaseMock.paymentsTable.update).toHaveBeenCalled();
    expect(supabaseMock.getPaymentsUpdatePayload()).toMatchObject({ status: "canceled" });
    expect(supabaseMock.getPaymentsUpdateArgs()).toEqual(["order_id", "order-2"]);

    expect(supabaseMock.historyTable.update).toHaveBeenCalled();
    expect(supabaseMock.getHistoryUpdatePayload()).toMatchObject({ reason: "manual review" });
    expect(supabaseMock.getHistoryUpdateArgs()).toEqual(["id", historyRow.id]);

    expect(supabaseMock.processedTable.insert).toHaveBeenCalled();
    expect(supabaseMock.getProcessedInsertArgs()).toMatchObject({
      event_type: "admin.force_cancel",
    });

    expect(notifyForceCancelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-2",
        reason: "manual review",
        adminUserId: "admin-1",
      }),
    );
    expect(resetOrdersCacheMock).toHaveBeenCalled();
  });
});
