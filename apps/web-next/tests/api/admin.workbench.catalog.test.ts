import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn(async () => ({ user: { id: "admin" } }));
vi.mock("@/utils/auth/guard", () => ({
  requireAdmin: requireAdminMock,
}));

let supabaseMock: any;
let catalogMock: any;

const getAdminClientMock = vi.fn((schema?: string) => (schema ? catalogMock : supabaseMock));
vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: getAdminClientMock,
}));

function buildCatalogGetMocks() {
  const skuRow = {
    id: "sku-1",
    title: "Test SKU",
    slug: "test-sku",
    catalog_product_id: "cat-1",
  };

  const catalogRow = {
    id: "cat-1",
    title: "Catalog Model",
    slug: "catalog-model",
    status: "published",
    brand_id: "brand-1",
    brands: { name: "Lenovo", slug: "lenovo" },
  };

  // ecom_products select
  const ecomMaybeSingle = vi.fn(async () => ({ data: skuRow, error: null }));
  const ecomEq = vi.fn(() => ({ maybeSingle: ecomMaybeSingle }));
  const ecomSelect = vi.fn(() => ({ eq: ecomEq }));

  // product_attributes (base attributes)
  const attrsInBase = vi.fn(async () => ({
    data: [
      { key: "gtin", value: "0123456789012" },
      { key: "mpn", value: "abc-123" },
      { key: "brand", value: "Lenovo" },
    ],
    error: null,
  }));
  const attrsEqBase = vi.fn(() => ({ in: attrsInBase }));

  // product_attributes (suggestions: gtin)
  const attrsLimitGtin = vi.fn(async () => ({
    data: [{ product_id: "sku-1", key: "gtin", value: "0123456789012", ecom_products: { catalog_product_id: "cat-1" } }],
    error: null,
  }));
  const attrsEqGtin = vi.fn(() => ({ limit: attrsLimitGtin }));

  // product_attributes (suggestions: mpn)
  const attrsLimitMpn = vi.fn(async () => ({
    data: [{ product_id: "sku-2", key: "mpn", value: "ABC-123", ecom_products: { catalog_product_id: "cat-1" } }],
    error: null,
  }));
  const attrsIlikeMpn = vi.fn(() => ({ limit: attrsLimitMpn }));

  const attrsInSuggestion = vi.fn(() => ({ eq: attrsEqGtin, ilike: attrsIlikeMpn }));
  const attrsSelect = vi.fn((fields: string) =>
    fields.includes("ecom_products(") ? { in: attrsInSuggestion } : { eq: attrsEqBase },
  );

  supabaseMock = {
    from: vi.fn((table: string) => {
      if (table === "ecom_products") return { select: ecomSelect };
      if (table === "product_attributes") return { select: attrsSelect };
      return {};
    }),
  };

  const catalogMaybeSingle = vi.fn(async () => ({ data: catalogRow, error: null }));
  const catalogEq = vi.fn(() => ({ maybeSingle: catalogMaybeSingle }));
  const catalogIn = vi.fn(() => ({
    data: [catalogRow],
    error: null,
  }));
  const catalogSelect = vi.fn(() => ({ eq: catalogEq, in: catalogIn }));

  catalogMock = {
    from: vi.fn(() => ({ select: catalogSelect })),
  };

  return {
    attrsEqGtin,
    attrsIlikeMpn,
  };
}

function buildCatalogLinkMocks() {
  const skuRow = { id: "sku-1", catalog_product_id: null };
  const ecomMaybeSingle = vi.fn(async () => ({ data: skuRow, error: null }));
  const ecomEqSelect = vi.fn(() => ({ maybeSingle: ecomMaybeSingle }));
  const ecomSelect = vi.fn(() => ({ eq: ecomEqSelect }));

  const ecomUpdateEq = vi.fn(async () => ({ error: null }));
  const ecomUpdate = vi.fn(() => ({ eq: ecomUpdateEq }));

  supabaseMock = {
    from: vi.fn((table: string) => {
      if (table === "ecom_products") return { select: ecomSelect, update: ecomUpdate };
      return {};
    }),
  };

  const catalogMaybeSingle = vi.fn(async () => ({ data: { id: "cat-1" }, error: null }));
  const catalogEq = vi.fn(() => ({ maybeSingle: catalogMaybeSingle }));
  const catalogSelect = vi.fn(() => ({ eq: catalogEq }));

  catalogMock = {
    from: vi.fn(() => ({ select: catalogSelect })),
  };

  return { ecomUpdateEq };
}

describe("Workbench catalog endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/admin/workbench/catalog returns catalog info and suggestions", async () => {
    const { attrsEqGtin, attrsIlikeMpn } = buildCatalogGetMocks();
    const { GET } = await import("@/app/api/admin/workbench/catalog/route");

    const response = await GET(
      new Request("http://localhost/api/admin/workbench/catalog?sku_id=sku-1") as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.catalog?.id).toBe("cat-1");
    expect(body.identifiers?.gtin).toBe("0123456789012");
    expect(body.identifiers?.mpn).toBe("ABC-123");
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect(body.suggestions?.[0]?.catalog_id).toBe("cat-1");
    expect(body.suggestions?.[0]?.match_types?.sort()).toEqual(["gtin", "mpn"].sort());
    expect(attrsEqGtin).toHaveBeenCalledWith("value", "0123456789012");
    expect(attrsIlikeMpn).toHaveBeenCalledWith("value", "ABC-123");
  });

  it("POST /api/admin/workbench/catalog/link links SKU to catalog model", async () => {
    const { ecomUpdateEq } = buildCatalogLinkMocks();
    const { POST } = await import("@/app/api/admin/workbench/catalog/link/route");

    const response = await POST(
      new Request("http://localhost/api/admin/workbench/catalog/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku_id: "sku-1", catalog_product_id: "cat-1" }),
      }) as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.catalog_product_id).toBe("cat-1");
    expect(ecomUpdateEq).toHaveBeenCalledWith("id", "sku-1");
  });
});
