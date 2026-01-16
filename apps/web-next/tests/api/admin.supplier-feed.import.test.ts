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

function buildSupabase(params: {
  supplierId: string;
  skuId: string;
  mappingRows?: Array<{ supplier_sku: string; sku_id: string }>;
}) {
  const { supplierId, skuId } = params;
  let mappingRows = params.mappingRows ?? [{ supplier_sku: "SUP-1", sku_id: skuId }];
  const runId = "run-1";

  const suppliersSelectMaybeSingle = vi.fn(async () => ({ data: { id: supplierId }, error: null }));
  const suppliersSelectEq = vi.fn(() => ({ maybeSingle: suppliersSelectMaybeSingle }));
  const suppliersSelect = vi.fn(() => ({ eq: suppliersSelectEq }));

  const ecomProductsSelectIn = vi.fn(async () => ({ data: [{ id: skuId }], error: null }));
  const ecomProductsSelect = vi.fn(() => ({ in: ecomProductsSelectIn }));
  const ecomProductsUpdateEq = vi.fn(async () => ({ error: null }));
  const ecomProductsUpdate = vi.fn(() => ({ eq: ecomProductsUpdateEq }));

  const runInsertMaybeSingle = vi.fn(async () => ({ data: { id: runId }, error: null }));
  const runInsertSelect = vi.fn(() => ({ maybeSingle: runInsertMaybeSingle }));
  const runInsert = vi.fn(() => ({ select: runInsertSelect }));
  const runUpdateEq = vi.fn(async () => ({ error: null }));
  const runUpdate = vi.fn(() => ({ eq: runUpdateEq }));

  const supplierSkusUpsert = vi.fn(async () => ({ error: null }));
  const supplierSkusSelectIn = vi.fn(async () => ({ data: mappingRows, error: null }));
  const supplierSkusSelectEqForMap = vi.fn(() => ({ in: supplierSkusSelectIn }));
  const supplierSkusSelectEqForMissing = vi.fn(async () => ({ data: [], error: null }));
  const supplierSkusSelect = vi.fn((columns?: string) => {
    if (typeof columns === "string" && columns.includes("supplier_sku")) {
      return { eq: supplierSkusSelectEqForMap };
    }
    return { eq: supplierSkusSelectEqForMissing };
  });

  const supplierFeedUnmappedUpsert = vi.fn(async () => ({ error: null }));

  const offersUpsert = vi.fn(async () => ({ error: null }));
  const offersSelectOr = vi.fn(async () => ({
    data: [{ supplier_id: supplierId, sku_id: skuId, price_cents: 1200, currency: "USD", status: "active", valid_to: null }],
    error: null,
  }));
  const offersSelectEq = vi.fn(() => ({ or: offersSelectOr }));
  const offersSelectIn = vi.fn(() => ({ eq: offersSelectEq }));
  const offersSelect = vi.fn(() => ({ in: offersSelectIn }));

  const inventoryUpsert = vi.fn(async () => ({ error: null }));
  const inventorySelectIn = vi.fn(async () => ({
    data: [{ supplier_id: supplierId, sku_id: skuId, is_available: true, inventory_status: "in_stock", stock_quantity: 5 }],
    error: null,
  }));
  const inventorySelect = vi.fn(() => ({ in: inventorySelectIn }));

  const from = vi.fn((table: string) => {
    switch (table) {
      case "suppliers":
        return { select: suppliersSelect };
      case "ecom_products":
        return { select: ecomProductsSelect, update: ecomProductsUpdate };
      case "supplier_feed_runs":
        return { insert: runInsert, update: runUpdate };
      case "supplier_skus":
        return { upsert: supplierSkusUpsert, select: supplierSkusSelect };
      case "supplier_offers":
        return { upsert: offersUpsert, select: offersSelect };
      case "supplier_inventory_levels":
        return { upsert: inventoryUpsert, select: inventorySelect };
      case "supplier_feed_unmapped":
        return { upsert: supplierFeedUnmappedUpsert };
      default:
        return {};
    }
  });

  return {
    from,
    runUpdateEq,
    offersUpsert,
    inventoryUpsert,
    supplierSkusUpsert,
    supplierFeedUnmappedUpsert,
    setMappingRows(next: Array<{ supplier_sku: string; sku_id: string }>) {
      mappingRows = next;
    },
  };
}

describe("POST /api/admin/supplier-feed/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("imports items and returns extended stats", async () => {
    const supplierId = "3a632dba-060a-44b0-bb32-fcc449e45cf7";
    const skuId = "11111111-1111-4000-8000-111111111111";
    supabaseMock = buildSupabase({ supplierId, skuId });

    const { POST } = await import("@/app/api/admin/supplier-feed/import/route");
    const response = await POST(
      new Request("http://localhost/api/admin/supplier-feed/import", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: supplierId,
          items: [
            {
              supplier_sku: "SUP-1",
              price_cents: 1200,
              currency: "USD",
              stock_quantity: 5,
              is_available: true,
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.stats).toMatchObject({
      mapped: 1,
      offers_upserted: 1,
      inventory_upserted: 1,
      ecom_updated: 1,
    });
  });

  it("flags missing vendor sku as invalid", async () => {
    const supplierId = "3a632dba-060a-44b0-bb32-fcc449e45cf7";
    const skuId = "11111111-1111-4000-8000-111111111111";
    supabaseMock = buildSupabase({ supplierId, skuId });

    const { POST } = await import("@/app/api/admin/supplier-feed/import/route");
    const response = await POST(
      new Request("http://localhost/api/admin/supplier-feed/import", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: supplierId,
          items: [
            {
              price_cents: 1200,
              currency: "USD",
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("no_valid_items");
    expect(body.details?.[0]?.reason).toBe("missing_vendor_sku");
  });

  it("records unmapped vendor sku rows", async () => {
    const supplierId = "3a632dba-060a-44b0-bb32-fcc449e45cf7";
    const skuId = "11111111-1111-4000-8000-111111111111";
    supabaseMock = buildSupabase({ supplierId, skuId, mappingRows: [] });

    const { POST } = await import("@/app/api/admin/supplier-feed/import/route");
    const response = await POST(
      new Request("http://localhost/api/admin/supplier-feed/import", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: supplierId,
          items: [
            {
              supplier_sku: "SUP-404",
              price_cents: 1200,
              currency: "USD",
              stock_quantity: 5,
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.stats).toMatchObject({ mapped: 0, unmapped: 1 });
    expect(supabaseMock.supplierFeedUnmappedUpsert).toHaveBeenCalled();
  });

  it("maps rows after mapping exists", async () => {
    const supplierId = "3a632dba-060a-44b0-bb32-fcc449e45cf7";
    const skuId = "11111111-1111-4000-8000-111111111111";
    supabaseMock = buildSupabase({ supplierId, skuId, mappingRows: [] });

    const { POST } = await import("@/app/api/admin/supplier-feed/import/route");
    const firstResponse = await POST(
      new Request("http://localhost/api/admin/supplier-feed/import", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: supplierId,
          items: [
            {
              supplier_sku: "SUP-1",
              price_cents: 1200,
              currency: "USD",
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    const firstBody = await firstResponse.json();
    expect(firstBody.stats).toMatchObject({ mapped: 0, unmapped: 1 });

    supabaseMock.setMappingRows([{ supplier_sku: "SUP-1", sku_id: skuId }]);

    const secondResponse = await POST(
      new Request("http://localhost/api/admin/supplier-feed/import", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: supplierId,
          items: [
            {
              supplier_sku: "SUP-1",
              price_cents: 1200,
              currency: "USD",
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      }) as any,
    );

    const secondBody = await secondResponse.json();
    expect(secondBody.stats).toMatchObject({ mapped: 1, unmapped: 0 });
  });
});
