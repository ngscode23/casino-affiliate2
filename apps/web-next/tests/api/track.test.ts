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

  it("writes click events to Supabase", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    mockCreateClient.mockResolvedValue({ from } as any);

    const { POST } = await import("@/app/api/track/click/route");
    const request = new Request("http://localhost/api/track/click", {
      method: "POST",
      body: JSON.stringify({ product_id: "prod-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("shop_clicks");
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({ product_id: "prod-1" });
  });

  it("returns 500 when Supabase rejects click insert", async () => {
    const insert = vi.fn().mockResolvedValue({ error: new Error("fail") });
    const from = vi.fn(() => ({ insert }));
    mockCreateClient.mockResolvedValue({ from } as any);

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

  it("writes impression events to Supabase", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const buildSelectChain = (data: unknown) => {
      const maybeSingle = vi.fn().mockResolvedValue({ data });
      const limit = vi.fn(() => ({ maybeSingle }));
      const eq = vi.fn(() => ({ limit }));
      const select = vi.fn(() => ({ eq }));
      return { select };
    };

    const from = vi.fn((table: string) => {
      if (table === "ecom_products") {
        return buildSelectChain({ id: "prod-1" });
      }
      if (table === "products") {
        return buildSelectChain({ id: "legacy-1" });
      }
      return { insert };
    });

    mockCreateClient.mockResolvedValue({ from } as any);

    const { POST } = await import("@/app/api/track/impression/route");
    const request = new Request("http://localhost/api/track/impression", {
      method: "POST",
      body: JSON.stringify({ product_id: "prod-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("shop_impressions");
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
