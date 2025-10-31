import { describe, it, expect, vi } from "vitest";

import { fetchMessagesForReviews } from "@/app/api/reviews/messages";

function createSupabaseMock(options: {
  rootRows?: Array<Record<string, unknown>> | null;
  rootError?: { code?: string; message?: string } | null;
  messageRows?: Array<Record<string, unknown>> | null;
  messageError?: { code?: string; message?: string } | null;
}) {
  let callIndex = 0;

  const chain: any = {
    select: vi.fn(() => chain),
    in: vi.fn((column: string, values: unknown[]) => {
      callIndex += 1;
      if (callIndex === 1) {
        chain.__lastResult = {
          data: options.rootRows ?? [],
          error: options.rootError ?? null,
        };
      } else {
        chain.__lastResult = {
          data: options.messageRows ?? [],
          error: options.messageError ?? null,
        };
      }
      return chain;
    }),
    order: vi.fn(() => chain),
    then: vi.fn((resolve) => resolve(chain.__lastResult)),
  };

  return {
    from: vi.fn((table: string) => {
      if (table !== "product_review_messages") {
        throw new Error(`Unexpected table ${table}`);
      }
      return chain;
    }),
  };
}

describe("fetchMessagesForReviews", () => {
  it("returns empty maps when ids array is empty", async () => {
    const supabase = createSupabaseMock({});
    const result = await fetchMessagesForReviews(supabase as any, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.messagesByReview.size).toBe(0);
      expect(result.rootIdByReview.size).toBe(0);
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("propagates database error from root lookup", async () => {
    const supabase = createSupabaseMock({
      rootError: { code: "db", message: "boom" },
    });
    const result = await fetchMessagesForReviews(supabase as any, ["00000000-0000-4000-8000-000000000001"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("boom");
    }
  });

  it("groups messages by review id", async () => {
    const reviewId = "00000000-0000-4000-8000-000000000001";
    const rootId = "10000000-0000-4000-8000-000000000000";
    const supabase = createSupabaseMock({
      rootRows: [
        { id: rootId, root_review_id: rootId, parent_id: null, review_raw_id: reviewId },
        { id: "child", root_review_id: rootId, parent_id: rootId, review_raw_id: reviewId },
      ],
      messageRows: [
        {
          id: rootId,
          root_review_id: rootId,
          parent_id: null,
          author_id: "user-1",
          author_role: "user",
          body: "Root",
          created_at: "2025-10-30T12:00:00Z",
          updated_at: "2025-10-30T12:00:00Z",
        },
        {
          id: "child",
          root_review_id: rootId,
          parent_id: rootId,
          author_id: "admin-1",
          author_role: "admin",
          body: "Reply",
          created_at: "2025-10-30T12:05:00Z",
          updated_at: "2025-10-30T12:05:00Z",
        },
      ],
    });

    const result = await fetchMessagesForReviews(supabase as any, [reviewId]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok result");
    const messages = result.messagesByReview.get(reviewId);
    expect(messages).toBeDefined();
    expect(messages).toHaveLength(2);
    expect(messages?.[0].id).toBe(rootId);
    expect(messages?.[1].author_role).toBe("admin");
    expect(result.rootIdByReview.get(reviewId)).toBe(rootId);
  });
});
