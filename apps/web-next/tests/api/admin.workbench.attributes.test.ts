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

function buildSupabaseAttributes() {
  const registryUpsert = vi.fn(async () => ({ error: null }));
  const productDeleteIn = vi.fn(async () => ({ error: null }));
  const productDeleteEq = vi.fn(() => ({ in: productDeleteIn }));
  const productDelete = vi.fn(() => ({ eq: productDeleteEq }));

  const productInsertSelect = vi.fn(async () => ({
    data: [
      { product_id: "sku-1", key: "gtin", value: "0123456789012" },
      { product_id: "sku-1", key: "mpn", value: "ABC-123" },
      { product_id: "sku-1", key: "brand", value: "Lenovo" },
    ],
    error: null,
  }));
  const productInsert = vi.fn(() => ({ select: productInsertSelect }));

  const from = vi.fn((table: string) => {
    switch (table) {
      case "attributes_registry":
        return { upsert: registryUpsert };
      case "product_attributes":
        return { delete: productDelete, insert: productInsert };
      default:
        return {};
    }
  });

  return {
    from,
    registryUpsert,
    productDeleteEq,
    productDeleteIn,
    productInsertSelect,
  };
}

describe("POST /api/admin/workbench/attributes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts registry keys and writes gtin/mpn/brand attributes", async () => {
    supabaseMock = buildSupabaseAttributes();
    const { POST } = await import("@/app/api/admin/workbench/attributes/route");

    const response = await POST(
      new Request("http://localhost/api/admin/workbench/attributes", {
        method: "POST",
        body: JSON.stringify({
          sku_id: "sku-1",
          gtin: "0123456789012",
          mpn: "abc-123",
          brand: "Lenovo",
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.items?.length).toBe(3);
    expect(supabaseMock.registryUpsert).toHaveBeenCalled();
    expect(supabaseMock.productDeleteEq).toHaveBeenCalledWith("product_id", "sku-1");
    expect(supabaseMock.productDeleteIn).toHaveBeenCalledWith("key", ["gtin", "mpn", "brand"]);
    expect(supabaseMock.productInsertSelect).toHaveBeenCalled();
  });
});
