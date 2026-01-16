import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCronSecretMock = vi.fn(() => ({ ok: true as const }));
vi.mock("@/utils/cron/guard", () => ({
  requireCronSecret: requireCronSecretMock,
}));

const requireAdminMock = vi.fn(async () => ({ user: { id: "admin" } }));
vi.mock("@/utils/auth/guard", () => ({
  requireAdmin: requireAdminMock,
}));

const createPurchaseOrderForPaidOrderMock = vi.fn(async () => undefined);
vi.mock("@/lib/workflows/purchase-orders", () => ({
  createPurchaseOrderForPaidOrder: createPurchaseOrderForPaidOrderMock,
}));

let supabaseMock: any;
const getAdminClientMock = vi.fn(() => supabaseMock);
vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: getAdminClientMock,
}));

function thenable(result: any) {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    not: () => builder,
    gte: () => builder,
    lte: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    update: () => builder,
    insert: () => builder,
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

describe("POST /api/admin/dropship/reconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPS_ALERT_EMAIL;
    delete process.env.ADMIN_ALERT_EMAIL;

    const paidOrders = [
      {
        id: "00000000-0000-4000-8000-000000000000",
        currency: "usd",
        paid_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ];

    supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "orders") {
          return thenable({ data: paidOrders, error: null });
        }
        if (table === "purchase_orders") {
          return {
            select: (cols: string) => {
              if (cols.trim() === "order_id") {
                return thenable({ data: [], error: null });
              }
              return thenable({ data: [], error: null });
            },
          };
        }
        if (table === "email_outbox") {
          return thenable({ data: null, error: null });
        }
        return thenable({ data: [], error: null });
      }),
    };
  });

  it("creates POs for paid orders missing purchase_orders", async () => {
    const { POST } = await import("@/app/api/admin/dropship/reconcile/route");
    const response = await POST(
      new Request("http://localhost/api/admin/dropship/reconcile", {
        method: "POST",
        headers: { "x-cron-secret": "secret" },
        body: JSON.stringify({ limit: 5 }),
      }) as any
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      paid_orders_checked: 1,
      paid_orders_missing_po: 1,
      attempted: 1,
    });

    expect(requireCronSecretMock).toHaveBeenCalledTimes(1);
    expect(requireAdminMock).not.toHaveBeenCalled();
    expect(createPurchaseOrderForPaidOrderMock).toHaveBeenCalledTimes(1);
    expect(createPurchaseOrderForPaidOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "00000000-0000-4000-8000-000000000000",
        orderCurrency: "usd",
      })
    );
  });
});
