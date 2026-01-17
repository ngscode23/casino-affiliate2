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

function buildSupabaseConflict(params: { supplierId: string; conflictSkuId: string }) {
  const { supplierId, conflictSkuId } = params;

  const supplierSkusSelectMaybeSingle = vi.fn(async () => ({
    data: { id: "map-conflict", sku_id: conflictSkuId, supplier_sku: "DUP-1" },
    error: null,
  }));
  type SupplierSkusSelectQuery = {
    eq: (column: string, value?: string) => SupplierSkusSelectQuery;
    maybeSingle: () => Promise<{ data: any; error: any }>;
  };
  const supplierSkusSelectQuery: SupplierSkusSelectQuery = {
    eq: () => supplierSkusSelectQuery,
    maybeSingle: supplierSkusSelectMaybeSingle,
  };

  const supplierSkusSelect = vi.fn(() => supplierSkusSelectQuery);
  const supplierSkusUpsert = vi.fn(() => ({ select: vi.fn() }));

  const from = vi.fn((table: string) => {
    if (table === "supplier_skus") {
      return { select: supplierSkusSelect, upsert: supplierSkusUpsert };
    }
    return {};
  });

  return { from, supplierSkusUpsert };
}

describe("POST /api/admin/workbench/map conflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 409 when vendor sku already mapped to another sku", async () => {
    const supplierId = "3a632dba-060a-44b0-bb32-fcc449e45cf7";
    const skuId = "11111111-1111-4000-8000-111111111111";
    const conflictSkuId = "22222222-2222-4000-8000-222222222222";
    supabaseMock = buildSupabaseConflict({ supplierId, conflictSkuId });

    const { POST } = await import("@/app/api/admin/workbench/map/route");
    const response = await POST(
      new Request("http://localhost/api/admin/workbench/map", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: supplierId,
          sku_id: skuId,
          vendor_sku: "DUP-1",
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("vendor_sku_already_mapped");
    expect(body.sku_id).toBe(conflictSkuId);
    expect(supabaseMock.supplierSkusUpsert).not.toHaveBeenCalled();
  });
});
