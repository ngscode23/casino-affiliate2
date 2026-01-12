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

const sendMailMock = vi.fn(async () => ({ messageId: "msg_1" }));
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock,
    })),
  },
}));

describe("POST /api/admin/email-outbox/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_FROM = "no-reply@example.com";

    const countEq = vi.fn(async () => ({ count: 1 }));
    const countSelect = vi.fn(() => ({ eq: countEq }));

    const updateEq2 = vi.fn(async () => ({ error: null }));
    const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
    const update = vi.fn(() => ({ eq: updateEq1 }));

    const from = vi.fn((table: string) => {
      if (table === "email_outbox") {
        return {
          select: countSelect,
          update,
        };
      }
      return {};
    });

    const rpc = vi.fn(async () => ({
      data: [
        {
          id: "00000000-0000-4000-8000-000000000000",
          type: "tracking_update",
          to_email: "user@example.com",
          payload: { order_id: "ord_1" },
          attempts: 1,
        },
      ],
      error: null,
    }));

    supabaseMock = { from, rpc };
  });

  it("claims a batch via RPC and sends emails once", async () => {
    const { POST } = await import("@/app/api/admin/email-outbox/process/route");
    const response = await POST(
      new Request("http://localhost/api/admin/email-outbox/process", {
        method: "POST",
      }) as any
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, eligible: 1, processed: 1, sent: 1 });
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "email_outbox_claim_batch",
      expect.objectContaining({ p_limit: expect.any(Number), p_stale_minutes: expect.any(Number) })
    );
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).toHaveBeenCalledWith("email_outbox");
  });
});

