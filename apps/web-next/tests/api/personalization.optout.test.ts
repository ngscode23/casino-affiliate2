import { beforeEach, describe, expect, it, vi } from "vitest";

const anonId = "11111111-1111-1111-1111-111111111111";

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}));

vi.mock("@/utils/auth/viewer", () => ({
  resolveViewerIdentity: vi.fn(() => ({ userId: null, anonId })),
}));

let supabaseMock: any;
vi.mock("@/utils/supabase/admin", () => ({
  getAdminClient: vi.fn(() => supabaseMock),
}));

const getRecommendationsForActorMock = vi.fn();
vi.mock("@/lib/recs-server", () => ({
  getRecommendationsForActor: getRecommendationsForActorMock,
}));

function buildProfileChain(optOut: boolean) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { opt_out: optOut },
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select };
}

function buildSupabaseMock(optOut: boolean) {
  const profileChain = buildProfileChain(optOut);
  const from = vi.fn((table: string) => {
    if (table === "user_profiles") {
      return { select: profileChain.select };
    }
    if (table === "user_events") {
      return { insert: vi.fn() };
    }
    return {} as any;
  });
  return { from };
}

describe("opt-out server enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock = buildSupabaseMock(true);
  });

  it("POST /api/recs returns 403 when opt-out", async () => {
    const { POST } = await import("@/app/api/recs/route");
    const request = new Request("http://localhost/api/recs", {
      method: "POST",
      body: JSON.stringify({ event: "view", productId: "prod-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.opt_out).toBe(true);
    expect(supabaseMock.from).not.toHaveBeenCalledWith("user_events");
  });

  it("GET /api/recs returns empty recommendations when opt-out", async () => {
    const { GET } = await import("@/app/api/recs/route");
    const response = await GET(new Request("http://localhost/api/recs?limit=4"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.opt_out).toBe(true);
    expect(payload.recommendations).toEqual([]);
    expect(getRecommendationsForActorMock).not.toHaveBeenCalled();
  });

  it("GET /api/recommendations/recent returns empty lists when opt-out", async () => {
    const { GET } = await import("@/app/api/recommendations/recent/route");
    const response = await GET(new Request("http://localhost/api/recommendations/recent"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.opt_out).toBe(true);
    expect(payload.recent).toEqual([]);
    expect(payload.recommended).toEqual([]);
  });

  it("POST /api/recent-views returns 403 when opt-out", async () => {
    const { POST } = await import("@/app/api/recent-views/route");
    const request = new Request("http://localhost/api/recent-views", {
      method: "POST",
      body: JSON.stringify({ productId: "22222222-2222-2222-2222-222222222222" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.opt_out).toBe(true);
    expect(supabaseMock.from).not.toHaveBeenCalledWith("user_events");
  });
});
