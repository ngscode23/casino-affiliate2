// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import type { User } from "@supabase/supabase-js";
// import { createServerClient } from "@supabase/ssr";

// import { getAdminClient } from "@/utils/supabase/admin";

// const SORT_KEYS = ["newest", "oldest", "rating_desc", "rating_asc"] as const;
// type SortKey = (typeof SORT_KEYS)[number];
// const SORT_KEY_SET = new Set<string>(SORT_KEYS);
// const DEFAULT_LIMIT = 20;
// const MAX_LIMIT = 50;
// const RATING_BUCKETS = [5, 4, 3, 2, 1] as const;
// type RatingBucket = (typeof RATING_BUCKETS)[number];
// const SORT_ORDER: Record<SortKey, Array<{ column: "rating" | "created_at" | "user_id"; ascending: boolean }>> = {
//   newest: [
//     { column: "created_at", ascending: false },
//     { column: "user_id", ascending: false },
//   ],
//   oldest: [
//     { column: "created_at", ascending: true },
//     { column: "user_id", ascending: true },
//   ],
//   rating_desc: [
//     { column: "rating", ascending: false },
//     { column: "created_at", ascending: false },
//     { column: "user_id", ascending: false },
//   ],
//   rating_asc: [
//     { column: "rating", ascending: true },
//     { column: "created_at", ascending: false },
//     { column: "user_id", ascending: false },
//   ],
// };

// function json(body: unknown, status = 200) {
//   return NextResponse.json(body, {
//     status,
//     headers: { "cache-control": "no-store" },
//   });
// }

// function isUuid(value: string | null | undefined): value is string {
//   if (!value) return false;
//   return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
// }

// function extractAccessToken(request: Request): string | null {
//   const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
//   if (!header) return null;
//   const trimmed = header.trim();
//   if (!trimmed) return null;
//   if (/^bearer\s+/i.test(trimmed)) {
//     return trimmed.replace(/^bearer\s+/i, "").trim() || null;
//   }
//   return trimmed;
// }

// async function getOptionalUser(request: Request): Promise<User | null> {
//   const token = extractAccessToken(request);
//   const admin = getAdminClient();

//   if (token) {
//     try {
//       const { data, error } = await admin.auth.getUser(token);
//       if (!error && data?.user) return data.user;
//     } catch {
//       // ignore token errors and try cookie-flow below
//     }
//   }

//   try {
//     const cookieStore = await cookies();
//     const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
//     const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
//     if (!url || !anon) return null;
//     const client = createServerClient(url, anon, {
//       cookies: {
//         getAll() {
//           return cookieStore.getAll();
//         },
//         setAll(cookiesToSet) {
//           try {
//             cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
//           } catch {
//             // ignore
//           }
//         },
//       },
//     });
//     const { data, error } = await client.auth.getUser();
//     if (!error && data?.user) return data.user;
//   } catch {
//     // ignore cookie based auth errors
//   }

//   return null;
// }

// function parseIntInRange(value: string | null, min: number, max: number, fallback: number): number {
//   const n = Number(value ?? "");
//   if (!Number.isFinite(n)) return fallback;
//   return Math.min(max, Math.max(min, Math.trunc(n)));
// }

// function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
//   if (!error) return false;
//   const code = error.code ?? "";
//   if (code === "PGRST302" || code === "42P01") return true;
//   const message = error.message ?? "";
//   return /schema cache/i.test(message) || /does not exist/i.test(message);
// }

// type CursorPayload = { ts: string; userId: string; sort: SortKey; rating?: number };

// function encodeCursor(input: CursorPayload): string {
//   try {
//     return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
//   } catch {
//     return "";
//   }
// }

// function decodeCursor(raw: string | null): CursorPayload | null {
//   if (!raw) return null;
//   try {
//     const json = Buffer.from(raw, "base64url").toString("utf8");
//     const obj = JSON.parse(json) as { ts?: string; userId?: string; sort?: string; rating?: number };
//     if (
//       obj &&
//       typeof obj.ts === "string" &&
//       typeof obj.userId === "string" &&
//       typeof obj.sort === "string" &&
//       SORT_KEY_SET.has(obj.sort) &&
//       isUuid(obj.userId) &&
//       Number.isFinite(Date.parse(obj.ts))
//     ) {
//       const payload: CursorPayload = { ts: obj.ts, userId: obj.userId, sort: obj.sort as SortKey };
//       if (typeof obj.rating === "number" && Number.isFinite(obj.rating)) {
//         payload.rating = obj.rating;
//       }
//       return payload;
//     }
//   } catch {
//     /* ignore */
//   }
//   return null;
// }

// function parseSort(value: string | null): SortKey {
//   if (typeof value !== "string") return "newest";
//   const trimmed = value.trim().toLowerCase();
//   return SORT_KEY_SET.has(trimmed) ? (trimmed as SortKey) : "newest";
// }

// function parseRating(value: string | null): number | null {
//   if (value === null || value === undefined || value === "") return null;
//   const n = Number(value);
//   if (!Number.isInteger(n)) return null;
//   if (n < 1 || n > 5) return null;
//   return n;
// }

// function buildCursorFilter(sort: SortKey, cursor: CursorPayload | null): string | null {
//   if (!cursor || cursor.sort !== sort) return null;
//   const { ts, userId } = cursor;
//   if (!isUuid(userId) || !Number.isFinite(Date.parse(ts))) return null;

//   switch (sort) {
//     case "newest":
//       return `created_at.lt.${ts},and(created_at.eq.${ts},user_id.lt.${userId})`;
//     case "oldest":
//       return `created_at.gt.${ts},and(created_at.eq.${ts},user_id.gt.${userId})`;
//     case "rating_desc": {
//       const rating = typeof cursor.rating === "number" ? Math.round(cursor.rating) : NaN;
//       if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
//       return [
//         `rating.lt.${rating}`,
//         `and(rating.eq.${rating},created_at.lt.${ts})`,
//         `and(rating.eq.${rating},created_at.eq.${ts},user_id.lt.${userId})`,
//       ].join(",");
//     }
//     case "rating_asc": {
//       const rating = typeof cursor.rating === "number" ? Math.round(cursor.rating) : NaN;
//       if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
//       return [
//         `rating.gt.${rating}`,
//         `and(rating.eq.${rating},created_at.lt.${ts})`,
//         `and(rating.eq.${rating},created_at.eq.${ts},user_id.lt.${userId})`,
//       ].join(",");
//     }
//     default:
//       return null;
//   }
// }
// export async function GET(request: Request) {
//   try {
//     const supabase = getAdminClient();
//     const url = new URL(request.url);
//     const params = url.searchParams;
//     const productId = params.get("product_id")?.trim() ?? "";
//     const sourceSchema = params.get("source_schema")?.trim() ?? "";
//     const sourceTable = params.get("source_table")?.trim() ?? "";
//     const sourcePk = params.get("source_pk")?.trim() ?? "";

//     let productUid: string | null = null;

//     if (sourceSchema && sourceTable && sourcePk) {
//       const { data, error } = await supabase
//         .from("product_catalog")
//         .select("product_uid")
//         .eq("source_schema", sourceSchema)
//         .eq("source_table", sourceTable)
//         .eq("source_pk", sourcePk)
//         .maybeSingle();
//       if (error) {
//         if (!isMissingTableError(error)) {
//           return json({ ok: false, code: "db", message: error.message }, 500);
//         }
//       } else {
//         productUid = data?.product_uid ?? null;
//       }
//     }

//     if (!productUid && productId) {
//       if (!isUuid(productId)) {
//         return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
//       }
//       const { data, error } = await supabase
//         .from("product_catalog")
//         .select("product_uid")
//         .eq("source_schema", "public")
//         .eq("source_table", "ecom_products")
//         .eq("source_pk", productId)
//         .maybeSingle();
//       if (error) {
//         if (!isMissingTableError(error)) {
//           return json({ ok: false, code: "db", message: error.message }, 500);
//         }
//       } else {
//         productUid = data?.product_uid ?? null;
//       }
//     }

//     if (!productUid && productId) {
//       productUid = productId;
//     }

//     if (!productUid) {
//       return json({ ok: true, items: [], stats: null });
//     }

//     const authUser = await getOptionalUser(request);
//     const sortKey = parseSort(params.get("sort"));
//     const limit = parseIntInRange(params.get("limit"), 1, MAX_LIMIT, DEFAULT_LIMIT);
//     const ratingFilter = parseRating(params.get("rating"));
//     if (params.has("rating") && ratingFilter === null) {
//       return json({ ok: false, code: "bad_request", message: "rating invalid" }, 400);
//     }
//     const cursor = decodeCursor(params.get("cursor"));
//     let effectiveCursor = cursor && cursor.sort === sortKey ? cursor : null;
//     if (
//       ratingFilter !== null &&
//       effectiveCursor &&
//       typeof effectiveCursor.rating === "number" &&
//       ratingFilter !== Math.round(effectiveCursor.rating)
//     ) {
//       effectiveCursor = null;
//     }
//     const pageSize = Math.min(MAX_LIMIT, Math.max(1, limit)) + 1;

//     let reviewsQuery = supabase
//       .from("product_reviews_raw")
//       .select("user_id, rating, title, body, created_at")
//       .eq("product_id", productUid)
//       .eq("status", "approved");

//     if (ratingFilter !== null) {
//       reviewsQuery = reviewsQuery.eq("rating", ratingFilter);
//     }

//     const cursorFilter = buildCursorFilter(sortKey, effectiveCursor);
//     if (cursorFilter) {
//       reviewsQuery = reviewsQuery.or(cursorFilter);
//     }

//     for (const order of SORT_ORDER[sortKey]) {
//       reviewsQuery = reviewsQuery.order(order.column, { ascending: order.ascending, nullsFirst: false });
//     }

//     const { data: rows, error: itemsErr } = await reviewsQuery.limit(pageSize);
//     if (itemsErr) {
//       if (!isMissingTableError(itemsErr)) {
//         console.error("[reviews:list] items", itemsErr.code ?? "unknown", itemsErr.message ?? "");
//         return json({ ok: false, code: "db" }, 500);
//       }
//     }

//     const list = Array.isArray(rows) ? rows : [];
//     const hasMore = list.length > limit;
//     const limitedRows = hasMore ? list.slice(0, limit) : list;
//     const lastRow = limitedRows[limitedRows.length - 1];
//     const nextCursor =
//       hasMore && lastRow
//         ? encodeCursor({
//             ts: lastRow.created_at,
//             userId: lastRow.user_id,
//             sort: sortKey,
//             rating: sortKey === "rating_desc" || sortKey === "rating_asc" ? lastRow.rating : undefined,
//           })
//         : null;
//     const authorIds = limitedRows
//       .map((row) => row.user_id)
//       .filter((value): value is string => typeof value === "string" && Boolean(value));
//     const uniqueAuthorIds = Array.from(new Set(authorIds));

//     const voteTotals = new Map<string, { helpful: number; notHelpful: number }>();
//     if (uniqueAuthorIds.length) {
//       const { data: voteRows, error: voteErr } = await supabase
//         .from("review_votes")
//         .select("review_author_id, value, count:id")
//         .eq("product_id", productUid)
//         .in("review_author_id", uniqueAuthorIds)
//         .group("review_author_id,value");
//       if (voteErr && !isMissingTableError(voteErr)) {
//         console.error("[reviews:list] votes", voteErr.code ?? "unknown", voteErr.message ?? "");
//       }
//       if (Array.isArray(voteRows)) {
//         for (const entry of voteRows as Array<{ review_author_id: string | null; value: number | null; count: number | null }>) {
//           if (!entry?.review_author_id) continue;
//           const count = Number(entry.count ?? 0);
//           if (!Number.isFinite(count)) continue;
//           const current = voteTotals.get(entry.review_author_id) ?? { helpful: 0, notHelpful: 0 };
//           if (entry.value === 1) {
//             current.helpful += count;
//           } else if (entry.value === -1) {
//             current.notHelpful += count;
//           }
//           voteTotals.set(entry.review_author_id, current);
//         }
//       }
//     }

//     const selfVoteMap = new Map<string, number>();
//     if (authUser && uniqueAuthorIds.length) {
//       const { data: selfVoteRows, error: selfVoteErr } = await supabase
//         .from("review_votes")
//         .select("review_author_id, value")
//         .eq("product_id", productUid)
//         .eq("voter_id", authUser.id)
//         .in("review_author_id", uniqueAuthorIds);
//       if (selfVoteErr && !isMissingTableError(selfVoteErr)) {
//         console.error("[reviews:list] self_vote", selfVoteErr.code ?? "unknown", selfVoteErr.message ?? "");
//       } else if (Array.isArray(selfVoteRows)) {
//         for (const row of selfVoteRows as Array<{ review_author_id: string | null; value: number | null }>) {
//           if (!row?.review_author_id) continue;
//           if (row.value !== 1 && row.value !== -1) continue;
//           selfVoteMap.set(row.review_author_id, row.value);
//         }
//       }
//     }

//     const responseItems = limitedRows.map(({ user_id: authorId, ...rest }) => {
//       const totals = authorId ? voteTotals.get(authorId) ?? { helpful: 0, notHelpful: 0 } : { helpful: 0, notHelpful: 0 };
//       const userVote = authorId ? selfVoteMap.get(authorId) ?? null : null;
//       const score = totals.helpful - totals.notHelpful;
//       return {
//         ...rest,
//         author_id: authorId ?? "",
//         votes: {
//           helpful: totals.helpful,
//           notHelpful: totals.notHelpful,
//           score,
//           user_vote: userVote,
//         },
//       };
//     });

//     const { data: stats, error: statsErr } = await supabase
//       .from("product_rating_stats")
//       .select("avg_rating, ratings_count")
//       .eq("product_uid", productUid)
//       .maybeSingle();
//     if (statsErr && !isMissingTableError(statsErr)) {
//       console.error("[reviews:list] stats", statsErr.code ?? "unknown", statsErr.message ?? "");
//       return json({ ok: false, code: "db" }, 500);
//     }

//     const bucketCounts = new Map<RatingBucket, number>();
//     const { data: histogramRows, error: histogramErr } = await supabase
//       .from("product_reviews_raw")
//       .select("rating, count:id")
//       .eq("product_id", productUid)
//       .eq("status", "approved")
//       .group("rating");
//     if (histogramErr && !isMissingTableError(histogramErr)) {
//       console.error("[reviews:list] histogram", histogramErr.code ?? "unknown", histogramErr.message ?? "");
//     }
//     if (Array.isArray(histogramRows)) {
//       for (const entry of histogramRows as Array<{ rating: number | null; count: number | null }>) {
//         const score = Number(entry?.rating ?? 0);
//         if (!Number.isFinite(score)) continue;
//         if (!RATING_BUCKETS.includes(score as RatingBucket)) continue;
//         const bucket = score as RatingBucket;
//         const value = Number(entry?.count ?? 0);
//         if (!Number.isFinite(value)) continue;
//         bucketCounts.set(bucket, value);
//       }
//     }

//     const statsCount = typeof stats?.ratings_count === "number" ? stats.ratings_count : null;
//     const totalRatings =
//       statsCount !== null && statsCount > 0
//         ? statsCount
//         : Array.from(bucketCounts.values()).reduce((acc, value) => acc + value, 0);
//     const buckets = RATING_BUCKETS.map((score) => {
//       const count = bucketCounts.get(score) ?? 0;
//       const percent = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
//       return { score, count, percent };
//     });

//     let own: Record<string, unknown> | null = null;
//     if (authUser) {
//       const { data: ownRow, error: ownErr } = await supabase
//         .from("product_reviews_raw")
//         .select("rating, title, body, status, created_at, updated_at")
//         .eq("product_id", productUid)
//         .eq("user_id", authUser.id)
//         .maybeSingle();
//       if (ownErr) {
//         if (!isMissingTableError(ownErr)) {
//           return json({ ok: false, code: "db", message: ownErr.message }, 500);
//         }
//       } else if (ownRow) {
//         own = ownRow;
//       }
//     }

//     const body = {
//       ok: true,
//       items: responseItems,
//       stats: stats ?? null,
//       own_review: own,
//       nextCursor: nextCursor || null,
//       hasMore,
//       buckets,
//     };
//     if (!authUser) {
//       return NextResponse.json(body, {
//         status: 200,
//         headers: {
//           "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
//         },
//       });
//     }
//     return NextResponse.json(body, {
//       status: 200,
//       headers: { "cache-control": "private, max-age=0, must-revalidate" },
//     });
//   } catch (error: any) {
//     return json(
//       { ok: false, code: "internal", message: String(error?.message ?? error) },
//       500,
//     );
//   }
// }

// export function POST() {
//   return json({ ok: false, code: "method_not_allowed" }, 405);
// }
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getAdminClient } from "@/utils/supabase/admin";
import { fetchMessagesForReviews, type ReviewMessageRecord } from "../messages";

const SORT_KEYS = ["newest", "oldest", "rating_desc", "rating_asc"] as const;
type SortKey = (typeof SORT_KEYS)[number];
const SORT_KEY_SET = new Set<string>(SORT_KEYS);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const RATING_BUCKETS = [5, 4, 3, 2, 1] as const;
type RatingBucket = (typeof RATING_BUCKETS)[number];

const SORT_ORDER: Record<
  SortKey,
  Array<{ column: "rating" | "created_at" | "user_id"; ascending: boolean }>
> = {
  newest: [
    { column: "created_at", ascending: false },
    { column: "user_id", ascending: false },
  ],
  oldest: [
    { column: "created_at", ascending: true },
    { column: "user_id", ascending: true },
  ],
  rating_desc: [
    { column: "rating", ascending: false },
    { column: "created_at", ascending: false },
    { column: "user_id", ascending: false },
  ],
  rating_asc: [
    { column: "rating", ascending: true },
    { column: "created_at", ascending: false },
    { column: "user_id", ascending: false },
  ],
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function isUuid(value: string | null | undefined): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function extractAccessToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  if (/^bearer\s+/i.test(trimmed)) {
    return trimmed.replace(/^bearer\s+/i, "").trim() || null;
  }
  return trimmed;
}

async function getOptionalUser(request: Request): Promise<User | null> {
  const token = extractAccessToken(request);
  const admin = getAdminClient();

  if (token) {
    try {
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data?.user) return data.user;
    } catch {/* ignore */}
  }

  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ?? process.env.SUPABASE_PUBLISHABLE_KEY
      ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) return null;

    const client = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {/* ignore */}
        },
      },
    });
    const { data, error } = await client.auth.getUser();
    if (!error && data?.user) return data.user;
  } catch {/* ignore */}

  return null;
}

function parseIntInRange(value: string | null, min: number, max: number, fallback: number): number {
  const n = Number(value ?? "");
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code === "PGRST302" || code === "42P01") return true;
  const message = error.message ?? "";
  return /schema cache/i.test(message) || /does not exist/i.test(message);
}

type CursorPayload = { ts: string; userId: string; sort: SortKey; rating?: number };

function encodeCursor(input: CursorPayload): string {
  try {
    return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
  } catch {
    return "";
  }
}

function decodeCursor(raw: string | null): CursorPayload | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const obj = JSON.parse(json) as { ts?: string; userId?: string; sort?: string; rating?: number };
    if (
      obj && typeof obj.ts === "string" && typeof obj.userId === "string" &&
      typeof obj.sort === "string" && SORT_KEY_SET.has(obj.sort) &&
      isUuid(obj.userId) && Number.isFinite(Date.parse(obj.ts))
    ) {
      const payload: CursorPayload = { ts: obj.ts, userId: obj.userId, sort: obj.sort as SortKey };
      if (typeof obj.rating === "number" && Number.isFinite(obj.rating)) payload.rating = obj.rating;
      return payload;
    }
  } catch {/* ignore */}
  return null;
}

function parseSort(value: string | null): SortKey {
  if (typeof value !== "string") return "newest";
  const trimmed = value.trim().toLowerCase();
  return SORT_KEY_SET.has(trimmed) ? (trimmed as SortKey) : "newest";
}

function parseRating(value: string | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

function buildCursorFilter(sort: SortKey, cursor: CursorPayload | null): string | null {
  if (!cursor || cursor.sort !== sort) return null;
  const { ts, userId } = cursor;
  if (!isUuid(userId) || !Number.isFinite(Date.parse(ts))) return null;

  switch (sort) {
    case "newest":
      return `created_at.lt.${ts},and(created_at.eq.${ts},user_id.lt.${userId})`;
    case "oldest":
      return `created_at.gt.${ts},and(created_at.eq.${ts},user_id.gt.${userId})`;
    case "rating_desc": {
      const rating = typeof cursor.rating === "number" ? Math.round(cursor.rating) : NaN;
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
      return [
        `rating.lt.${rating}`,
        `and(rating.eq.${rating},created_at.lt.${ts})`,
        `and(rating.eq.${rating},created_at.eq.${ts},user_id.lt.${userId})`,
      ].join(",");
    }
    case "rating_asc": {
      const rating = typeof cursor.rating === "number" ? Math.round(cursor.rating) : NaN;
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
      return [
        `rating.gt.${rating}`,
        `and(rating.eq.${rating},created_at.lt.${ts})`,
        `and(rating.eq.${rating},created_at.eq.${ts},user_id.lt.${userId})`,
      ].join(",");
    }
    default:
      return null;
  }
}

export async function GET(request: Request) {
  try {
    const supabase = getAdminClient();
    const url = new URL(request.url);
    const params = url.searchParams;
    const productId = params.get("product_id")?.trim() ?? "";
    const sourceSchema = params.get("source_schema")?.trim() ?? "";
    const sourceTable = params.get("source_table")?.trim() ?? "";
    const sourcePk = params.get("source_pk")?.trim() ?? "";

    let productUid: string | null = null;

    // optional mapping via product_catalog (если существует)
    if (sourceSchema && sourceTable && sourcePk) {
      const tableCandidates =
        ["products", "ecom_products"].includes(sourceTable) ? ["products", "ecom_products"] : [sourceTable];
      const { data, error } = await supabase
        .from("product_catalog")
        .select("product_uid")
        .eq("source_schema", sourceSchema)
        .in("source_table", tableCandidates)
        .eq("source_pk", sourcePk)
        .maybeSingle();
      if (error) {
        if (!isMissingTableError(error)) {
          return json({ ok: false, code: "db", message: error.message }, 500);
        }
      } else {
        productUid = data?.product_uid ?? null;
      }
    }

    if (!productUid && productId) {
      if (!isUuid(productId)) {
        return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
      }
      const { data, error } = await supabase
        .from("product_catalog")
        .select("product_uid")
        .eq("source_schema", "public")
        .in("source_table", ["products", "ecom_products"])
        .eq("source_pk", productId)
        .maybeSingle();
      if (error) {
        if (!isMissingTableError(error)) {
          return json({ ok: false, code: "db", message: error.message }, 500);
        }
      } else {
        productUid = data?.product_uid ?? null;
      }
    }

    if (!productUid && productId) {
      productUid = productId;
    }

    if (!productUid) {
      return json({ ok: true, items: [], stats: null });
    }

    const authUser = await getOptionalUser(request);
    const sortKey = parseSort(params.get("sort"));
    const limit = parseIntInRange(params.get("limit"), 1, MAX_LIMIT, DEFAULT_LIMIT);
    const ratingFilter = parseRating(params.get("rating"));
    if (params.has("rating") && ratingFilter === null) {
      return json({ ok: false, code: "bad_request", message: "rating invalid" }, 400);
    }

    const cursor = decodeCursor(params.get("cursor"));
    let effectiveCursor = cursor && cursor.sort === sortKey ? cursor : null;
    if (
      ratingFilter !== null &&
      effectiveCursor &&
      typeof effectiveCursor.rating === "number" &&
      ratingFilter !== Math.round(effectiveCursor.rating)
    ) {
      effectiveCursor = null;
    }
    const pageSize = Math.min(MAX_LIMIT, Math.max(1, limit)) + 1;

    // список утвержденных отзывов
    let reviewsQuery = supabase
      .from("product_reviews_raw")
      .select("id, product_id, user_id, rating, title, body, created_at")
      .eq("product_id", productUid)
      .eq("status", "approved");

    if (ratingFilter !== null) {
      reviewsQuery = reviewsQuery.eq("rating", ratingFilter);
    }

    const cursorFilter = buildCursorFilter(sortKey, effectiveCursor);
    if (cursorFilter) {
      reviewsQuery = reviewsQuery.or(cursorFilter);
    }

    for (const order of SORT_ORDER[sortKey]) {
      reviewsQuery = reviewsQuery.order(order.column, { ascending: order.ascending, nullsFirst: false });
    }

    const { data: rows, error: itemsErr } = await reviewsQuery.limit(pageSize);
    if (itemsErr && !isMissingTableError(itemsErr)) {
      console.error("[reviews:list] items", itemsErr.code ?? "unknown", itemsErr.message ?? "");
      return json({ ok: false, code: "db", message: itemsErr.message }, 500);
    }

    const list = Array.isArray(rows) ? rows : [];
    const hasMore = list.length > limit;
    const limitedRows = hasMore ? list.slice(0, limit) : list;
    const lastRow = limitedRows[limitedRows.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({
            ts: lastRow.created_at,
            userId: lastRow.user_id,
            sort: sortKey,
            rating: sortKey === "rating_desc" || sortKey === "rating_asc" ? lastRow.rating : undefined,
          })
        : null;

    // агрегируем голоса без .group()
    const authorIds = Array.from(
      new Set(
        limitedRows
          .map((row) => row.user_id)
          .filter((v): v is string => typeof v === "string" && !!v),
      ),
    );

    const votesPromise =
      authorIds.length > 0
        ? supabase
            .from("review_votes")
            .select("review_author_id, value")
            .eq("product_id", productUid)
            .in("review_author_id", authorIds)
        : Promise.resolve<{ data: Array<{ review_author_id: string | null; value: number | null }> | null; error: null }>({
            data: [],
            error: null,
          });

    const selfVotesPromise =
      authUser && authorIds.length > 0
        ? supabase
            .from("review_votes")
            .select("review_author_id, value")
            .eq("product_id", productUid)
            .eq("voter_id", authUser.id)
            .in("review_author_id", authorIds)
        : Promise.resolve<{ data: Array<{ review_author_id: string | null; value: number | null }> | null; error: null }>({
            data: [],
            error: null,
          });

    const statsPromise = supabase.rpc("get_product_rating_stats", { p_product_id: productUid });

    const ownReviewPromise =
      authUser
        ? supabase
            .from("product_reviews_raw")
            .select("rating, title, body, status, created_at, updated_at")
            .eq("product_id", productUid)
            .eq("user_id", authUser.id)
            .maybeSingle()
        : Promise.resolve<{ data: Record<string, unknown> | null; error: null }>({ data: null, error: null });

    const [
      { data: voteRows, error: voteErr },
      { data: selfVoteRows, error: selfVoteErr },
      { data: statsJson, error: statsErr },
      { data: ownRow, error: ownErr },
    ] = await Promise.all([votesPromise, selfVotesPromise, statsPromise, ownReviewPromise]);

    const voteTotals = new Map<string, { helpful: number; notHelpful: number }>();
    if (voteErr && !isMissingTableError(voteErr)) {
      console.error("[reviews:list] votes", voteErr.code ?? "unknown", voteErr.message ?? "");
    } else if (Array.isArray(voteRows)) {
      for (const entry of voteRows as Array<{ review_author_id: string | null; value: number | null }>) {
        const id = entry?.review_author_id;
        if (!id) continue;
        const current = voteTotals.get(id) ?? { helpful: 0, notHelpful: 0 };
        if (entry.value === 1) current.helpful += 1;
        else if (entry.value === -1) current.notHelpful += 1;
        voteTotals.set(id, current);
      }
    }

    const selfVoteMap = new Map<string, number>();
    if (selfVoteErr && !isMissingTableError(selfVoteErr)) {
      console.error("[reviews:list] self_vote", selfVoteErr.code ?? "unknown", selfVoteErr.message ?? "");
    } else if (Array.isArray(selfVoteRows)) {
      for (const row of selfVoteRows as Array<{ review_author_id: string | null; value: number | null }>) {
        if (!row?.review_author_id) continue;
        if (row.value !== 1 && row.value !== -1) continue;
        selfVoteMap.set(row.review_author_id, row.value);
      }
    }

    const reviewIds = limitedRows
      .map((row) => {
        const id = (row as any).id;
        return typeof id === "string" && id ? id : null;
      })
      .filter((value): value is string => value !== null);

    const rootIdByReview = new Map<string, string>();
    const messagesByReview = new Map<string, ReviewMessageRecord[]>();
    if (reviewIds.length > 0) {
      const messageResult = await fetchMessagesForReviews(supabase, reviewIds);
      if (!messageResult.ok) {
        if (!isMissingTableError(messageResult.error)) {
          console.error(
            "[reviews:list] messages",
            messageResult.error.code ?? "unknown",
            messageResult.error.message ?? "",
          );
        }
      } else {
        rootIdByReview.clear();
        messageResult.rootIdByReview.forEach((value, key) => rootIdByReview.set(key, value));
        messageResult.messagesByReview.forEach((value, key) => messagesByReview.set(key, value));
      }
    }

    const responseItems = limitedRows.map((row) => {
      const { user_id: authorId, ...rest } = row as {
        user_id: string | null;
        id?: string | null;
        product_id?: string | null;
        [key: string]: unknown;
      };
      const reviewId = typeof (row as any).id === "string" ? (row as any).id : null;
      const totals = authorId ? voteTotals.get(authorId) ?? { helpful: 0, notHelpful: 0 } : { helpful: 0, notHelpful: 0 };
      const userVote = authorId ? selfVoteMap.get(authorId) ?? null : null;
      const score = totals.helpful - totals.notHelpful;

      const rootId = reviewId ? rootIdByReview.get(reviewId) ?? null : null;
      let messageNodes = reviewId ? messagesByReview.get(reviewId) ?? [] : [];
      if ((!messageNodes || messageNodes.length === 0) && reviewId) {
        const fallbackId = `raw:${reviewId}`;
        messageNodes = [
          {
            id: fallbackId,
            root_review_id: fallbackId,
            parent_id: null,
            author_id: authorId ?? null,
            author_role: "user",
            body: typeof (rest as any).body === "string" ? ((rest as any).body as string) : "",
            created_at: typeof (rest as any).created_at === "string" ? ((rest as any).created_at as string) : "",
            updated_at: typeof (rest as any).created_at === "string" ? ((rest as any).created_at as string) : "",
          },
        ];
      }

      const adminMessages = messageNodes.filter((message) => message.author_role === "admin");
      const replyMeta = adminMessages.length > 0 ? adminMessages[adminMessages.length - 1] : null;

      return {
        ...rest,
        author_id: authorId ?? "",
        review_id: reviewId,
        reply_body: replyMeta?.body ?? null,
        reply_created_at: replyMeta?.created_at ?? null,
        reply_author_id: replyMeta?.author_id ?? null,
        messages: messageNodes.map((message) => ({ ...message })),
        votes: {
          helpful: totals.helpful,
          notHelpful: totals.notHelpful,
          score,
          user_vote: userVote,
        },
      };
    });

    // рейтинг и гистограмма через RPC вместо .group()
    let statsOut: { avg_rating: number | null; ratings_count: number } | null = null;
    let buckets: Array<{ score: RatingBucket; count: number; percent: number }> = RATING_BUCKETS.map(s => ({ score: s, count: 0, percent: 0 }));

    if (statsErr && !isMissingTableError(statsErr)) {
      console.error("[reviews:list] stats_rpc", statsErr.code ?? "unknown", statsErr.message ?? "");
    } else if (statsJson && typeof statsJson === "object") {
      const count = Number((statsJson as any).count ?? 0);
      const avg = (statsJson as any).avg ?? null;
      const histogram = (statsJson as any).histogram ?? {};
      statsOut = { avg_rating: avg, ratings_count: Number.isFinite(count) ? count : 0 };

      const bucketCounts = new Map<RatingBucket, number>();
      for (const k of Object.keys(histogram)) {
        const keyNum = Number(k);
        if (RATING_BUCKETS.includes(keyNum as RatingBucket)) {
          const v = Number(histogram[k]);
          if (Number.isFinite(v)) bucketCounts.set(keyNum as RatingBucket, v);
        }
      }
      const total = Array.from(bucketCounts.values()).reduce((a, v) => a + v, 0);
      buckets = RATING_BUCKETS.map((score) => {
        const cnt = bucketCounts.get(score) ?? 0;
        const percent = total > 0 ? Math.round((cnt / total) * 100) : 0;
        return { score, count: cnt, percent };
      });
    }

    // собственный отзыв пользователя
    let own: Record<string, unknown> | null = null;
    if (ownErr && !isMissingTableError(ownErr)) {
      return json({ ok: false, code: "db", message: ownErr.message }, 500);
    }
    if (ownRow) {
      own = ownRow;
    }

    const body = {
      ok: true,
      items: responseItems,
      stats: statsOut,     // { avg_rating, ratings_count }
      own_review: own,
      nextCursor: nextCursor || null,
      hasMore,
      buckets,
    };

    if (!authUser) {
      return NextResponse.json(body, {
        status: 200,
        headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
      });
    }
    return NextResponse.json(body, {
      status: 200,
      headers: { "cache-control": "private, max-age=0, must-revalidate" },
    });
  } catch (error: any) {
    return json({ ok: false, code: "internal", message: String(error?.message ?? error) }, 500);
  }
}

export function POST() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}





