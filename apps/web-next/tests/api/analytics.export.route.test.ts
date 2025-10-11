import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/auth/guard", () => ({
  requireAdmin: vi.fn(async () => ({ user: { id: "admin" } })),
}));

let supabaseMock: any;
vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: vi.fn(() => supabaseMock),
}));

const parseRangeMock = vi.fn();
const parseFiltersMock = vi.fn();
const buildAnalyticsSnapshotMock = vi.fn();

vi.mock("@/app/api/admin/analytics-service", () => ({
  parseRange: parseRangeMock,
  parseFilters: parseFiltersMock,
  buildAnalyticsSnapshot: buildAnalyticsSnapshotMock,
}));

describe("/api/admin/analytics/export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock = {};

    parseRangeMock.mockReturnValue({
      from: new Date("2025-10-01T00:00:00Z"),
      to: new Date("2025-10-10T23:59:59Z"),
    });
    parseFiltersMock.mockReturnValue({
      raw: { slugs: [], utmSources: [], utmCampaigns: [], devices: [], langs: [], referrerHosts: [] },
      normalized: {
        slugs: new Set(),
        utmSources: new Set(),
        utmCampaigns: new Set(),
        devices: new Set(),
        langs: new Set(),
        referrerHosts: new Set(),
      },
      limit: 50,
      compare: false,
    } as any);

    buildAnalyticsSnapshotMock.mockResolvedValue({
      snapshot: {} as any,
      internals: {
        topSlugsFull: [
          { slug: "s1", clicks: 10, impressions: 100, ctr: 0.1, paid: 2, cr: 0.2, revenue: { USD: 100 }, revenueTotal: 100, avgOrderValue: 50 },
          { slug: "s2", clicks: 5, impressions: 50, ctr: 0.1, paid: 1, cr: 0.2, revenue: { USD: 50 }, revenueTotal: 50, avgOrderValue: 50 },
          { slug: "s3", clicks: 1, impressions: 20, ctr: 0.05, paid: 0, cr: 0, revenue: {}, revenueTotal: 0, avgOrderValue: null },
        ],
        topSourcesFull: [
          { source: "google", count: 20, paid: 3, cr: 0.15, revenue: { USD: 120 }, revenueTotal: 120, avgOrderValue: 40 },
          { source: "newsletter", count: 10, paid: 2, cr: 0.2, revenue: { USD: 80 }, revenueTotal: 80, avgOrderValue: 40 },
        ],
        clicks: null,
        impressions: null,
        conversions: null,
        payments: { attempts: 0, paidOrdersSet: new Set() },
        refundsByCurrency: {},
      },
    });
  });

  it("returns JSON export with pagination", async () => {
    const { GET } = await import("@/app/api/admin/analytics/export/route");
    const response = await GET(
      new Request("http://localhost/api/admin/analytics/export?entity=slugs&format=json&offset=1&limit=1"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.entity).toBe("slugs");
    expect(body.pagination).toEqual({ offset: 1, limit: 1, total: 3 });
    expect(body.items).toHaveLength(1);
    expect(body.items[0].slug).toBe("s2");
  });

  it("returns CSV export for sources", async () => {
    const { GET } = await import("@/app/api/admin/analytics/export/route");
    const response = await GET(new Request("http://localhost/api/admin/analytics/export?entity=sources&format=csv"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    const text = await response.text();
    const lines = text.trim().split("\n");
    expect(lines[0]).toContain("source");
    expect(lines).toHaveLength(1 + 2);
  });
});
