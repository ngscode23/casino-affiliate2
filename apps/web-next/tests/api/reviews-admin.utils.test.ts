import { describe, it, expect, vi } from "vitest";

import { applyReviewStatus } from "@/app/api/reviews-admin/utils";

function createSupabaseMock(options: {
  review?: { id: string; status: string; product_uid?: string | null };
  selectError?: { message: string };
  rpcError?: { message: string };
  refreshError?: { message: string };
}) {
  const maybeSingle = vi.fn(async () => ({ data: options.review ?? null, error: options.selectError ?? null }));

  const selectChain = {
    eq: vi.fn(() => selectChain),
    maybeSingle,
  };

  const from = vi.fn(() => ({
    select: vi.fn(() => selectChain),
  }));

  const rpc = vi.fn(async (fn: string) => {
    if (fn === "admin_set_review_status") {
      return { error: options.rpcError ?? null };
    }
    if (fn === "refresh_product_rating_stats") {
      return { error: options.refreshError ?? null };
    }
    return { error: null };
  });

  return { from, rpc };
}

describe("applyReviewStatus", () => {
  it("returns changed=false for invalid review id", async () => {
    const supabase = createSupabaseMock({});
    const result = await applyReviewStatus(supabase as any, "not-a-uuid", null, "approved");
    expect(result.changed).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns error when select fails", async () => {
    const supabase = createSupabaseMock({ selectError: { message: "boom" } });
    const result = await applyReviewStatus(
      supabase as any,
      "00000000-0000-4000-8000-000000000001",
      null,
      "approved",
    );
    expect(result).toHaveProperty("error");
  });

  it("returns changed=false when status already matches", async () => {
    const supabase = createSupabaseMock({
      review: { id: "00000000-0000-4000-8000-000000000001", status: "approved" },
    });
    const result = await applyReviewStatus(
      supabase as any,
      "00000000-0000-4000-8000-000000000001",
      null,
      "approved",
    );
    expect(result.changed).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalledWith("admin_set_review_status", expect.anything());
  });

  it("returns error when RPC fails", async () => {
    const supabase = createSupabaseMock({
      review: { id: "00000000-0000-4000-8000-000000000001", status: "pending" },
      rpcError: { message: "rpc failed" },
    });
    const result = await applyReviewStatus(
      supabase as any,
      "00000000-0000-4000-8000-000000000001",
      null,
      "approved",
    );
    expect(result).toHaveProperty("error");
  });

  it("updates status and refreshes metrics", async () => {
    const supabase = createSupabaseMock({
      review: { id: "00000000-0000-4000-8000-000000000001", status: "pending", product_uid: "00000000-0000-4000-8000-000000000099" },
    });
    const result = await applyReviewStatus(
      supabase as any,
      "00000000-0000-4000-8000-000000000001",
      null,
      "approved",
    );
    expect(result.changed).toBe(true);
    expect(result.productUid).toBe("00000000-0000-4000-8000-000000000099");
    expect(supabase.rpc).toHaveBeenCalledWith("admin_set_review_status", {
      p_review_id: "00000000-0000-4000-8000-000000000001",
      p_status: "approved",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("refresh_product_rating_stats", {
      p_product_id: "00000000-0000-4000-8000-000000000099",
    });
  });
});

