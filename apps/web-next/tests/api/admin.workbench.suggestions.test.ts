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

function buildSupabaseSuggestions() {
  const unmappedMaybeSingle = vi.fn(async () => ({
    data: {
      id: "unmapped-1",
      vendor_sku: "TEST-100",
      sample_payload: { gtin: "0123456789012", mpn: "abc-123" },
    },
    error: null,
  }));
  type UnmappedSelectQuery = {
    eq: (column: string, value?: string) => UnmappedSelectQuery;
    maybeSingle: () => Promise<{ data: any; error: any }>;
  };
  const unmappedSelectQuery: UnmappedSelectQuery = {
    eq: () => unmappedSelectQuery,
    maybeSingle: unmappedMaybeSingle,
  };
  const unmappedSelect = vi.fn(() => unmappedSelectQuery);

  const skuRow = {
    id: "sku-1",
    sku: "SKU-1",
    slug: "sku-1",
    title: "SKU 1",
    currency: "USD",
    price_cents: 1200,
    status: "draft",
  };

  const gtinLimit = vi.fn(async () => ({
    data: [{ product_id: "sku-1", key: "gtin", value: "0123456789012", ecom_products: skuRow }],
    error: null,
  }));
  const gtinEq = vi.fn(() => ({ limit: gtinLimit }));

  const mpnLimit = vi.fn(async () => ({
    data: [{ product_id: "sku-1", key: "mpn", value: "ABC-123", ecom_products: skuRow }],
    error: null,
  }));
  const mpnIlike = vi.fn(() => ({ limit: mpnLimit }));

  const attributesIn = vi.fn(() => ({ eq: gtinEq, ilike: mpnIlike }));
  const attributesSelect = vi.fn(() => ({ in: attributesIn }));

  const from = vi.fn((table: string) => {
    switch (table) {
      case "supplier_feed_unmapped":
        return { select: unmappedSelect };
      case "product_attributes":
        return { select: attributesSelect };
      default:
        return {};
    }
  });

  return { from, gtinEq, mpnIlike };
}

describe("GET /api/admin/workbench/suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns suggestions based on GTIN and MPN", async () => {
    supabaseMock = buildSupabaseSuggestions();
    const { GET } = await import("@/app/api/admin/workbench/suggestions/route");

    const response = await GET(
      new Request(
        "http://localhost/api/admin/workbench/suggestions?supplier_id=sup-1&vendor_sku=TEST-100",
      ) as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.identifiers?.gtin).toBe("0123456789012");
    expect(body.identifiers?.mpn).toBe("ABC-123");
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect(body.suggestions?.length).toBe(1);
    expect(body.suggestions?.[0]?.sku?.id).toBe("sku-1");
    expect(body.suggestions?.[0]?.match_types?.sort()).toEqual(["gtin", "mpn"].sort());
    expect(supabaseMock.gtinEq).toHaveBeenCalledWith("value", "0123456789012");
    expect(supabaseMock.mpnIlike).toHaveBeenCalledWith("value", "ABC-123");
  });
});
