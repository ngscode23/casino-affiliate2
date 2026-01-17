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

function buildSupabaseCreate(params: { supplierId: string; vendorSku: string }) {
  const { supplierId, vendorSku } = params;
  const createdSku = {
    id: "sku-1",
    slug: "vendor-sku-test",
    sku: "SKU-VENDOR-1",
    title: "Vendor SKU Test",
    currency: "USD",
  };
  const mappingRow = {
    id: "map-1",
    supplier_id: supplierId,
    sku_id: createdSku.id,
    supplier_sku: vendorSku,
    cost_cents: 1000,
    currency: "USD",
    lead_time_days: 2,
    ecom_products: createdSku,
  };

  const suppliersSelectMaybeSingle = vi.fn(async () => ({ data: { default_currency: "USD" }, error: null }));
  const suppliersSelectEq = vi.fn(() => ({ maybeSingle: suppliersSelectMaybeSingle }));
  const suppliersSelect = vi.fn(() => ({ eq: suppliersSelectEq }));

  const ecomProductsSelectLimit = vi.fn(async () => ({ data: [], error: null }));
  const ecomProductsSelectOr = vi.fn(() => ({ limit: ecomProductsSelectLimit }));
  const ecomProductsSelect = vi.fn(() => ({ or: ecomProductsSelectOr }));

  const ecomProductsInsertMaybeSingle = vi.fn(async () => ({ data: createdSku, error: null }));
  const ecomProductsInsertSelect = vi.fn(() => ({ maybeSingle: ecomProductsInsertMaybeSingle }));
  const ecomProductsInsert = vi.fn(() => ({ select: ecomProductsInsertSelect }));

  const supplierSkusSelectMaybeSingle = vi.fn(async () => ({ data: null, error: null }));
  type SupplierSkusSelectQuery = {
    eq: (column: string, value?: string) => SupplierSkusSelectQuery;
    maybeSingle: () => Promise<{ data: any; error: any }>;
  };
  const supplierSkusSelectQuery: SupplierSkusSelectQuery = {
    eq: () => supplierSkusSelectQuery,
    maybeSingle: supplierSkusSelectMaybeSingle,
  };
  const supplierSkusSelect = vi.fn(() => supplierSkusSelectQuery);

  const supplierSkusInsertMaybeSingle = vi.fn(async () => ({ data: mappingRow, error: null }));
  const supplierSkusInsertSelect = vi.fn(() => ({ maybeSingle: supplierSkusInsertMaybeSingle }));
  const supplierSkusInsert = vi.fn(() => ({ select: supplierSkusInsertSelect }));

  const unmappedSelectMaybeSingle = vi.fn(async () => ({
    data: {
      id: "unmapped-1",
      vendor_sku: vendorSku,
      sample_payload: { title: "Vendor SKU Test", price_cents: 1200, currency: "USD" },
    },
    error: null,
  }));
  type UnmappedSelectQuery = {
    eq: (column: string, value?: string) => UnmappedSelectQuery;
    maybeSingle: () => Promise<{ data: any; error: any }>;
  };
  const unmappedSelectQuery: UnmappedSelectQuery = {
    eq: () => unmappedSelectQuery,
    maybeSingle: unmappedSelectMaybeSingle,
  };
  const unmappedSelect = vi.fn(() => unmappedSelectQuery);
  const unmappedDeleteEq2 = vi.fn(async () => ({ data: [], error: null }));
  const unmappedDeleteEq1 = vi.fn(() => ({ eq: unmappedDeleteEq2 }));
  const unmappedDelete = vi.fn(() => ({ eq: unmappedDeleteEq1 }));

  const ecomProductsDeleteEq = vi.fn(async () => ({ data: [], error: null }));
  const ecomProductsDelete = vi.fn(() => ({ eq: ecomProductsDeleteEq }));

  const from = vi.fn((table: string) => {
    switch (table) {
      case "suppliers":
        return { select: suppliersSelect };
      case "ecom_products":
        return { select: ecomProductsSelect, insert: ecomProductsInsert, delete: ecomProductsDelete };
      case "supplier_skus":
        return { select: supplierSkusSelect, insert: supplierSkusInsert };
      case "supplier_feed_unmapped":
        return { select: unmappedSelect, delete: unmappedDelete };
      default:
        return {};
    }
  });

  return {
    from,
    unmappedDeleteEq2,
  };
}

describe("POST /api/admin/workbench/create-from-unmapped", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates draft SKU and mapping from unmapped vendor sku", async () => {
    const supplierId = "3a632dba-060a-44b0-bb32-fcc449e45cf7";
    const vendorSku = "VENDOR-1";
    supabaseMock = buildSupabaseCreate({ supplierId, vendorSku });

    const { POST } = await import("@/app/api/admin/workbench/create-from-unmapped/route");
    const response = await POST(
      new Request("http://localhost/api/admin/workbench/create-from-unmapped", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: supplierId,
          vendor_sku: vendorSku,
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.sku?.id).toBe("sku-1");
    expect(body.item?.supplier_sku).toBe(vendorSku);
    expect(supabaseMock.unmappedDeleteEq2).toHaveBeenCalled();
  });
});
