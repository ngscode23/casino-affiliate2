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

function buildSupabaseConflict(params: { supplierId: string; skuId: string; conflictSkuId: string }) {
  const { supplierId, skuId, conflictSkuId } = params;

  const supplierSkusSelectExistingMaybeSingle = vi.fn(async () => ({
    data: { supplier_id: supplierId, sku_id: skuId },
    error: null,
  }));
  const supplierSkusSelectExistingQuery = {
    eq: vi.fn(() => supplierSkusSelectExistingQuery),
    maybeSingle: supplierSkusSelectExistingMaybeSingle,
  };

  const supplierSkusSelectConflictMaybeSingle = vi.fn(async () => ({
    data: { id: "map-conflict", sku_id: conflictSkuId, supplier_sku: "DUP-1" },
    error: null,
  }));
  const supplierSkusSelectConflictQuery = {
    eq: vi.fn(() => supplierSkusSelectConflictQuery),
    maybeSingle: supplierSkusSelectConflictMaybeSingle,
  };

  const supplierSkusSelect = vi.fn((columns?: string) => {
    if (columns && columns.includes("supplier_id") && columns.includes("sku_id")) {
      return supplierSkusSelectExistingQuery;
    }
    if (columns && columns.includes("supplier_sku")) {
      return supplierSkusSelectConflictQuery;
    }
    return supplierSkusSelectExistingQuery;
  });

  const supplierSkusUpdate = vi.fn(() => ({ select: vi.fn() }));

  const from = vi.fn((table: string) => {
    if (table === "supplier_skus") {
      return { select: supplierSkusSelect, update: supplierSkusUpdate };
    }
    return {};
  });

  return { from, supplierSkusUpdate };
}

describe("PUT /api/admin/supplier-skus conflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 409 when vendor sku already mapped to another sku", async () => {
    const supplierId = "3a632dba-060a-44b0-bb32-fcc449e45cf7";
    const skuId = "11111111-1111-4000-8000-111111111111";
    const conflictSkuId = "22222222-2222-4000-8000-222222222222";
    supabaseMock = buildSupabaseConflict({ supplierId, skuId, conflictSkuId });

    const { PUT } = await import("@/app/api/admin/supplier-skus/route");
    const response = await PUT(
      new Request("http://localhost/api/admin/supplier-skus", {
        method: "PUT",
        body: JSON.stringify({
          id: "map-1",
          supplier_sku: "DUP-1",
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("vendor_sku_already_mapped");
    expect(body.sku_id).toBe(conflictSkuId);
  });
});
