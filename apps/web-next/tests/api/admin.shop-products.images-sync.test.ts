import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn(async () => ({
  accessToken: "token",
  user: { id: "admin-1" },
}));

vi.mock("@/utils/auth/guard", () => ({
  requireAdmin: requireAdminMock,
}));

const revalidateTagMock = vi.fn();
const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  revalidatePath: revalidatePathMock,
}));

let supabaseMock: any;
const getAdminClientMock = vi.fn(() => supabaseMock);
vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: getAdminClientMock,
}));

function buildSupabase(returnRow: Record<string, unknown>) {
  const catalogUpdateOr = vi.fn(async () => ({ error: null }));
  const catalogUpdateEq = vi.fn(() => ({ or: catalogUpdateOr }));
  const catalogUpdate = vi.fn(() => ({ eq: catalogUpdateEq }));

  const maybeSingle = vi.fn(async () => ({ data: returnRow, error: null }));
  const select = vi.fn(() => ({ maybeSingle }));
  const insert = vi.fn(() => ({ select }));

  const from = vi.fn((table: string) => {
    if (table === "ecom_products") {
      return { insert };
    }
    if (table === "catalog_products") {
      return { update: catalogUpdate };
    }
    return {} as any;
  });

  return {
    from,
    insert,
    catalogUpdate,
  };
}

describe("POST /api/admin/shop/products image sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("syncs thumbnail and revalidates cache on upsert", async () => {
    const slug = "test-camera";
    const imageUrl = "https://example.com/image.jpg";
    supabaseMock = buildSupabase({
      id: "sku-1",
      title: "Test Camera",
      slug,
      sku: "SKU-TEST-1",
      price: 99.5,
      price_cents: 9950,
      currency: "EUR",
      status: "published",
      category_slug: "cameras",
      catalog_product_id: "catalog-1",
      images: [imageUrl],
    });

    const { POST } = await import("@/app/api/admin/shop/products/route");

    const response = await POST(
      new Request("http://localhost/api/admin/shop/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "upsert",
          product: {
            title: "Test Camera",
            slug,
            sku: "SKU-TEST-1",
            price: 99.5,
            currency: "EUR",
            status: "published",
            category_slug: "cameras",
            catalog_product_id: "catalog-1",
            images: [imageUrl],
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(supabaseMock.catalogUpdate).toHaveBeenCalledWith({ thumbnail_url: imageUrl });
    expect(revalidateTagMock).toHaveBeenCalledWith("products:list");
    expect(revalidateTagMock).toHaveBeenCalledWith(`product:${slug}`);
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/products/${slug}`);
  });
});
