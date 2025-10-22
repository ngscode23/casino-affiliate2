import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}));

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

const mockCreateClient = vi.mocked(createClient);

describe("track API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns 400 for missing product_id on click", async () => {
    const { POST } = await import("@/app/api/track/click/route");
    const request = new Request("http://localhost/api/track/click", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("writes click events via RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockResolvedValue({ rpc } as any);

    const { POST } = await import("@/app/api/track/click/route");
    const request = new Request("http://localhost/api/track/click", {
      method: "POST",
      body: JSON.stringify({ product_id: "prod-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("log_click", expect.objectContaining({ product_id: "prod-1" }));
  });

  it("returns 500 when RPC rejects click", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: new Error("fail") });
    mockCreateClient.mockResolvedValue({ rpc } as any);

    const { POST } = await import("@/app/api/track/click/route");
    const request = new Request("http://localhost/api/track/click", {
      method: "POST",
      body: JSON.stringify({ product_id: "prod-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });

  it("returns 400 for missing product_id on impression", async () => {
    const { POST } = await import("@/app/api/track/impression/route");
    const request = new Request("http://localhost/api/track/impression", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("writes impression events via RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const buildSelectChain = (data: unknown) => {
      const maybeSingle = vi.fn().mockResolvedValue({ data });
      const limit = vi.fn(() => ({ maybeSingle }));
      const eq = vi.fn(() => ({ limit }));
      const select = vi.fn(() => ({ eq }));
      return { select };
    };

    const from = vi.fn((table: string) => {
      if (table === "products") {
        return buildSelectChain({ id: "prod-1", slug: "prod-slug" });
      }
      if (table === "legacy_products") {
        return buildSelectChain({ id: "legacy-1", slug: "legacy-slug" });
      }
      return {} as any;
    });

    mockCreateClient.mockResolvedValue({ from, rpc } as any);

    const { POST } = await import("@/app/api/track/impression/route");
    const request = new Request("http://localhost/api/track/impression", {
      method: "POST",
      body: JSON.stringify({ product_id: "prod-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("log_impression", expect.objectContaining({ product_id: "prod-1" }));
  });
});
