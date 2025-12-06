import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import ProductReviews from "@/components/ProductReviews";

vi.mock("@shared/lib/authStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/lib/authStore")>();
  return {
    ...actual,
    useAuthState: () => ({ user: null, session: null }),
    subscribe: () => () => {},
    setAuthState: () => {},
    clearAuthState: () => {},
    getAuthState: () => ({ user: null, session: null }),
  };
});

type ReviewsResponse = {
  ok: boolean;
  items: unknown[];
  stats: { avg_rating: number; ratings_count: number };
  buckets?: Array<{ score: number; count: number; percent: number }>;
  own_review?: unknown;
  nextCursor?: string | null;
  hasMore?: boolean;
};

const REVIEW_SET_FILTER_EVENT = "product-reviews:set-filter";
const REVIEW_FILTER_CHANGE_EVENT = "product-reviews:filter-change";

const createResponse = (body: ReviewsResponse) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const flushEffects = () => new Promise((resolve) => setTimeout(resolve, 0));
const waitForEffects = () =>
  act(async () => {
    await flushEffects();
  });

const addFilterChangeListener = (handler: (event: Event) => void) => {
  act(() => {
    window.addEventListener(REVIEW_FILTER_CHANGE_EVENT, handler);
  });
};

const removeFilterChangeListener = (handler: (event: Event) => void) => {
  act(() => {
    window.removeEventListener(REVIEW_FILTER_CHANGE_EVENT, handler);
  });
};

const dispatchSetFilterEvent = async (rating: number) => {
  await act(async () => {
    window.dispatchEvent(
      new CustomEvent(REVIEW_SET_FILTER_EVENT, {
        detail: { rating },
      }),
    );
    await flushEffects();
  });
  await waitForEffects();
};

describe("ProductReviews events bridge", () => {
  let originalFetch: typeof global.fetch;
  let requests: URL[];
  let queue: ReviewsResponse[];
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    originalFetch = global.fetch;
    requests = [];
    queue = [];

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const href =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      requests.push(new URL(href, "http://localhost"));
      const next = queue.shift();
      if (!next) {
        throw new Error("No mock response queued for fetch");
      }
      return Promise.resolve(createResponse(next));
    }) as typeof fetch;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("reacts to product-reviews:set-filter and emits filter-change", async () => {
    queue.push(
      {
        ok: true,
        items: [],
        stats: { avg_rating: 4.5, ratings_count: 10 },
        buckets: [
          { score: 5, count: 6, percent: 60 },
          { score: 4, count: 4, percent: 40 },
        ],
      },
      {
        ok: true,
        items: [],
        stats: { avg_rating: 4.5, ratings_count: 10 },
        buckets: [
          { score: 5, count: 6, percent: 60 },
          { score: 4, count: 4, percent: 40 },
        ],
      },
    );

    const filterChangeHandler = vi.fn();
    addFilterChangeListener(filterChangeHandler);

    await act(async () => {
      root.render(
        <ProductReviews
          productId="00000000-0000-4000-8000-000000000000"
          slug="demo-product"
          initialAverage={4.5}
          initialCount={10}
        />,
      );
    });

    await waitForEffects();

    expect(requests.length).toBe(1);
    expect(requests[0].searchParams.get("rating")).toBeNull();

    await dispatchSetFilterEvent(4);

    expect(requests.length).toBeGreaterThanOrEqual(2);
    const latestRequest = requests[requests.length - 1];
    expect(latestRequest.searchParams.get("rating")).toBe("4");
    expect(filterChangeHandler).toHaveBeenCalled();
    const lastCall = filterChangeHandler.mock.calls[filterChangeHandler.mock.calls.length - 1]?.[0];
    expect(lastCall).toBeInstanceOf(CustomEvent);
    expect(lastCall?.detail).toEqual({ rating: 4 });

    removeFilterChangeListener(filterChangeHandler);
  });
});
