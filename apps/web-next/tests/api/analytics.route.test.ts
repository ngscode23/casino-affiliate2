import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks for admin guard and Supabase client
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
const buildCompareBlockMock = vi.fn();

vi.mock("@/app/api/admin/analytics-service", () => ({
  parseRange: parseRangeMock,
  parseFilters: parseFiltersMock,
  buildAnalyticsSnapshot: buildAnalyticsSnapshotMock,
  buildCompareBlock: buildCompareBlockMock,
}));

const baseSnapshot = () => ({
  range: { from: "2025-10-01T00:00:00.000Z", to: "2025-10-10T23:59:59.999Z" },
  totals: { clicks: 10, impressions: 100 },
  byDay: { clicks: [], impressions: [] },
  topSlugs: [],
  sparkline: {},
  topSources: [],
  utm: [],
  devices: [],
  languages: [],
  kpi: { revenueByCurrency: {}, refundsByCurrency: {}, netByCurrency: {} },
  funnel: { impressions: 100, clicks: 10, payment_attempts: 5, paid: 2 },
  meta: { limit: 50, generatedAt: "2025-10-11T00:00:00.000Z", filters: {}, fallback: { conversions: false } },
});

describe("/api/admin/analytics route", () => {
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
      snapshot: baseSnapshot(),
      internals: {
        topSlugsFull: [],
        topSourcesFull: [],
        clicks: null,
        impressions: null,
        conversions: null,
        payments: { attempts: 0, paidOrdersSet: new Set() },
        refundsByCurrency: {},
      },
    });
    buildCompareBlockMock.mockReturnValue({
      rangePrev: baseSnapshot().range,
      kpiPrev: baseSnapshot().kpi,
      funnelPrev: baseSnapshot().funnel,
      diffAbs: { clicks: 0, impressions: 0, paid: 0, revenue: {}, cr: 0, aov: 0 },
      diffPct: { clicks: 0, impressions: 0, paid: 0, revenue: {}, cr: 0, aov: 0 },
    });
  });

  it("returns snapshot payload", async () => {
    const { GET } = await import("@/app/api/admin/analytics/route");
    const response = await GET(new Request("http://localhost/api/admin/analytics"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.snapshot).toMatchObject(baseSnapshot());
    expect(buildAnalyticsSnapshotMock).toHaveBeenCalledTimes(1);
  });

  it("attaches compare block when compare=1", async () => {
    parseFiltersMock.mockReturnValueOnce({
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
      compare: true,
    } as any);

    buildAnalyticsSnapshotMock
      .mockResolvedValueOnce({
        snapshot: baseSnapshot(),
        internals: {
          topSlugsFull: [],
          topSourcesFull: [],
          clicks: null,
          impressions: null,
          conversions: null,
          payments: { attempts: 0, paidOrdersSet: new Set() },
          refundsByCurrency: {},
        },
      })
      .mockResolvedValueOnce({
        snapshot: { ...baseSnapshot(), totals: { clicks: 5, impressions: 50 } },
        internals: {
          topSlugsFull: [],
          topSourcesFull: [],
          clicks: null,
          impressions: null,
          conversions: null,
          payments: { attempts: 0, paidOrdersSet: new Set() },
          refundsByCurrency: {},
        },
      });

    const { GET } = await import("@/app/api/admin/analytics/route");
    const response = await GET(new Request("http://localhost/api/admin/analytics?compare=1"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(buildAnalyticsSnapshotMock).toHaveBeenCalledTimes(2);
    expect(buildCompareBlockMock).toHaveBeenCalledTimes(1);
    expect(payload.snapshot.compare).toBeDefined();
  });

  it("returns 500 when snapshot builder throws", async () => {
    buildAnalyticsSnapshotMock.mockRejectedValueOnce(new Error("fail"));
    const { GET } = await import("@/app/api/admin/analytics/route");
    const response = await GET(new Request("http://localhost/api/admin/analytics"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("internal");
  });
});
