import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const getAdminClientMock = vi.fn();

vi.mock("@/utils/auth/guard", () => ({
  requireAdmin: (...args: unknown[]) => requireAdminMock(...args),
}));

vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: (...args: unknown[]) => getAdminClientMock(...args),
}));

function createSupabaseMock(returnRow: Record<string, unknown>) {
  let insertedPayload: Record<string, unknown> | null = null;

  const maybeSingle = vi.fn(async () => ({ data: returnRow, error: null }));
  const select = vi.fn(() => ({ maybeSingle }));
  const insert = vi.fn((payload: Record<string, unknown>) => {
    insertedPayload = payload;
    return { select };
  });

  const catalogUpdateOr = vi.fn(async () => ({ error: null }));
  const catalogUpdateEq = vi.fn(() => ({ or: catalogUpdateOr }));
  const catalogUpdate = vi.fn(() => ({ eq: catalogUpdateEq }));

  const table = {
    insert,
  };

  const from = vi.fn((tableName: string) => {
    if (tableName === "ecom_products") return table;
    if (tableName === "catalog_products") return { update: catalogUpdate };
    return {} as any;
  });

  return {
    client: { from },
    insert,
    select,
    maybeSingle,
    getInsertedPayload: () => insertedPayload,
  };
}

describe("POST /api/admin/shop/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    requireAdminMock.mockResolvedValue({ accessToken: "token", user: { id: "admin-1" } });
  });

  it("creates a SKU via upsert", async () => {
    const returnRow = {
      id: "sku-1",
      title: "Test Phone",
      slug: "test-phone",
      sku: "TEST-001",
      price: 12.5,
      price_cents: 1250,
      currency: "EUR",
      status: "published",
      category_slug: "phones",
      catalog_product_id: "catalog-1",
    };
    const supabaseMock = createSupabaseMock(returnRow);
    getAdminClientMock.mockReturnValue(supabaseMock.client);

    const { POST } = await import("@/app/api/admin/shop/products/route");

    const response = await POST(
      new Request("http://localhost/api/admin/shop/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "upsert",
          product: {
            title: "Test Phone",
            slug: "test-phone",
            sku: "TEST-001",
            price: 12.5,
            currency: "eur",
            status: "published",
            category_slug: "phones",
            short_desc: "Short",
            tags: ["tag-1"],
            images: ["sku-1/main.webp"],
            rating: 4.2,
            specs: { foo: "bar" },
            catalog_product_id: "catalog-1",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, id: "sku-1" });

    const inserted = supabaseMock.getInsertedPayload();
    expect(inserted).toMatchObject({
      title: "Test Phone",
      slug: "test-phone",
      sku: "TEST-001",
      price: 12.5,
      price_cents: 1250,
      currency: "EUR",
      status: "published",
      category_slug: "phones",
      short_desc: "Short",
      tags: ["tag-1"],
      images: ["sku-1/main.webp"],
      rating: 4.2,
      specs: { foo: "bar" },
      catalog_product_id: "catalog-1",
    });
  });
});
