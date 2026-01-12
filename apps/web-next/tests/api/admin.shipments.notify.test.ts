import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn(async () => ({ user: { id: "admin" } }));
vi.mock("@/utils/auth/guard", () => ({
  requireAdmin: requireAdminMock,
}));

let supabaseMock: any;
const getAdminClientMock = vi.fn(() => supabaseMock);
vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: getAdminClientMock,
}));

function buildSupabase(options: { prevStatus: string | null }) {
  const emailOutboxInsert = vi.fn(async () => ({ error: null }));

  const ordersMaybeSingle = vi.fn(async () => ({
    data: {
      user_id: null,
      contact_email: "user@example.com",
      checkout_metadata: {},
    },
    error: null,
  }));
  const ordersEq = vi.fn(() => ({ maybeSingle: ordersMaybeSingle }));
  const ordersSelect = vi.fn(() => ({ eq: ordersEq }));

  const shipmentsSelectMaybeSingle = vi.fn(async () => ({
    data: { status: options.prevStatus },
    error: null,
  }));
  const shipmentsSelectEq = vi.fn(() => ({ maybeSingle: shipmentsSelectMaybeSingle }));
  const shipmentsSelect = vi.fn(() => ({ eq: shipmentsSelectEq }));

  const shipmentsUpdateMaybeSingle = vi.fn(async () => ({
    data: { id: "ship_1", status: "in_transit" },
    error: null,
  }));
  const shipmentsUpdateSelect = vi.fn(() => ({ maybeSingle: shipmentsUpdateMaybeSingle }));
  const shipmentsUpdateEq = vi.fn(() => ({ select: shipmentsUpdateSelect }));
  const shipmentsUpdate = vi.fn(() => ({ eq: shipmentsUpdateEq }));

  const purchaseOrdersUpdateEq = vi.fn(async () => ({ error: null }));
  const purchaseOrdersUpdate = vi.fn(() => ({ eq: purchaseOrdersUpdateEq }));

  const from = vi.fn((table: string) => {
    switch (table) {
      case "shipments":
        return {
          select: shipmentsSelect,
          update: shipmentsUpdate,
        };
      case "orders":
        return { select: ordersSelect };
      case "email_outbox":
        return { insert: emailOutboxInsert };
      case "purchase_orders":
        return { update: purchaseOrdersUpdate };
      default:
        return {};
    }
  });

  return { from, emailOutboxInsert };
}

describe("POST /api/admin/shipments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not enqueue tracking email when status is unchanged", async () => {
    supabaseMock = buildSupabase({ prevStatus: "in_transit" });

    const { POST } = await import("@/app/api/admin/shipments/route");
    const response = await POST(
      new Request("http://localhost/api/admin/shipments", {
        method: "POST",
        body: JSON.stringify({
          id: "ship_1",
          order_id: "ord_1",
          purchase_order_id: "po_1",
          status: "in_transit",
          tracking_number: "TN123",
        }),
        headers: { "Content-Type": "application/json" },
      }) as any
    );

    expect(response.status).toBe(200);
    expect(supabaseMock.emailOutboxInsert).not.toHaveBeenCalled();
  });

  it("enqueues tracking email when status changes to a non-pending value", async () => {
    supabaseMock = buildSupabase({ prevStatus: "pending" });

    const { POST } = await import("@/app/api/admin/shipments/route");
    const response = await POST(
      new Request("http://localhost/api/admin/shipments", {
        method: "POST",
        body: JSON.stringify({
          id: "ship_1",
          order_id: "ord_1",
          purchase_order_id: "po_1",
          status: "in_transit",
          tracking_number: "TN123",
        }),
        headers: { "Content-Type": "application/json" },
      }) as any
    );

    expect(response.status).toBe(200);
    expect(supabaseMock.emailOutboxInsert).toHaveBeenCalledTimes(1);
    const insertArg = supabaseMock.emailOutboxInsert.mock.calls[0]?.[0];
    expect(insertArg).toMatchObject({
      type: "tracking_update",
      order_id: "ord_1",
      to_email: "user@example.com",
      status: "pending",
    });
  });
});

