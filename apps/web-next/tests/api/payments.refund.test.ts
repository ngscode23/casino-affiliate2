import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/utils/auth/guard", () => ({
  requireAdmin: vi.fn(async () => ({
    user: {
      id: "admin-1",
      email: "admin@example.com",
      role: "admin",
      isActive: true,
      metadata: null,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    rawUser: {} as any,
    accessToken: "token",
  })),
}));

let supabaseMock: any;
vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: vi.fn(() => supabaseMock),
}));

// Mock Stripe SDK used by ensureStripe
const refundsCreate = vi.fn();
vi.mock("stripe", () => ({
  default: class Stripe {
    refunds = { create: refundsCreate };
    constructor() {}
  },
}));

// Ensure Stripe secret present
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";

describe("/api/payments/refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid order_id", async () => {
    const { POST } = await import("@/app/api/payments/refund/route");
    const request = new Request("http://localhost/api/payments/refund", {
      method: "POST",
      body: JSON.stringify({ order_id: "bad" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 404 when order not found", async () => {
    // supabase.from('orders').select(...).eq(...).maybeSingle() => { data: null }
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const rpc = vi.fn();
    supabaseMock = { from, rpc };

    const { POST } = await import("@/app/api/payments/refund/route");
    const request = new Request("http://localhost/api/payments/refund", {
      method: "POST",
      body: JSON.stringify({ order_id: "00000000-0000-4000-8000-000000000000" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("returns 409 when order is not paid/fulfilled", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "o1", status: "pending", amount_cents: 1000, currency: "usd", payment_intent_id: "pi_1" },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const rpc = vi.fn();
    supabaseMock = { from, rpc };

    const { POST } = await import("@/app/api/payments/refund/route");
    const request = new Request("http://localhost/api/payments/refund", {
      method: "POST",
      body: JSON.stringify({ order_id: "00000000-0000-4000-8000-000000000000" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(409);
  });

  it("creates refund and applies DB transition", async () => {
    // orders lookup
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "o1", status: "paid", amount_cents: 1000, currency: "usd", payment_intent_id: "pi_1", paid_at: new Date().toISOString() },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn((table: string) => ({ select }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    supabaseMock = { from, rpc };

    refundsCreate.mockResolvedValue({ id: "re_1", amount: 1000, currency: "usd" });

    const { POST } = await import("@/app/api/payments/refund/route");
    const request = new Request("http://localhost/api/payments/refund", {
      method: "POST",
      body: JSON.stringify({ order_id: "00000000-0000-4000-8000-000000000000" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.refund_id).toBe("re_1");
    expect(rpc).toHaveBeenCalledWith("refund_order_apply", expect.objectContaining({ p_order_id: expect.any(String) }));
  });
});

