// "use server";

// import { NextResponse } from "next/server";
// import { revalidateTag } from "next/cache";

// import { requireAuth } from "@/utils/auth/guard";
// import { getAdminClient } from "@/utils/supabase/admin";

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

// function clampString(value: unknown, max: number): string {
//   if (typeof value !== "string") return "";
//   const trimmed = value.trim();
//   if (!trimmed) return "";
//   return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
// }

// export async function POST(request: Request) {
//   const auth = await requireAuth(request);
//   if ("response" in auth) return auth.response;

//   let payload: Record<string, unknown> = {};
//   try {
//     payload = (await request.json()) as Record<string, unknown>;
//   } catch {
//     return json({ ok: false, code: "bad_json" }, 400);
//   }

//   const productId = clampString(payload.product_id, 36);
//   const reviewAuthorId = clampString(payload.review_author_id, 36);
//   const valueRaw = payload.value;

//   if (!isUuid(productId)) {
//     return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
//   }
//   if (!isUuid(reviewAuthorId)) {
//     return json({ ok: false, code: "bad_request", message: "review_author_id invalid" }, 400);
//   }
//   if (reviewAuthorId === auth.user.id) {
//     return json({ ok: false, code: "bad_request", message: "cannot vote on own review" }, 400);
//   }

//   const value = Number(valueRaw);
//   if (!Number.isInteger(value) || (value !== 1 && value !== -1)) {
//     return json({ ok: false, code: "bad_request", message: "value must be 1 or -1" }, 400);
//   }

//   try {
//     const supabase = getAdminClient();

//     let productUid: string | null = null;
//     const { data: catalogRow, error: catalogErr } = await supabase
//       .from("product_catalog")
//       .select("product_uid")
//       .eq("source_schema", "public")
//       .eq("source_table", "ecom_products")
//       .eq("source_pk", productId)
//       .maybeSingle();
//     if (catalogErr) {
//       const missing =
//         catalogErr.code === "PGRST302" ||
//         catalogErr.code === "42P01" ||
//         /schema cache/i.test(catalogErr.message ?? "") ||
//         /does not exist/i.test(catalogErr.message ?? "");
//       if (!missing) {
//         return json({ ok: false, code: "db" }, 500);
//       }
//     } else {
//       productUid = (catalogRow?.product_uid as string | null) ?? null;
//     }
//     if (!productUid) {
//       productUid = productId;
//     }

//     const { data: reviewRow, error: reviewErr } = await supabase
//       .from("product_reviews_raw")
//       .select("status, product_id")
//       .eq("product_id", productUid)
//       .eq("user_id", reviewAuthorId)
//       .maybeSingle();
//     if (reviewErr) {
//       return json({ ok: false, code: "db" }, 500);
//     }
//     if (!reviewRow || reviewRow.status !== "approved") {
//       return json({ ok: false, code: "not_found", message: "review not available" }, 404);
//     }

//     const resolvedProductId = typeof reviewRow.product_id === "string" ? reviewRow.product_id : productUid;
//     const now = new Date().toISOString();

//     const { data: voteRow, error: voteErr } = await supabase
//       .from("review_votes")
//       .upsert(
//         {
//           product_id: resolvedProductId,
//           review_author_id: reviewAuthorId,
//           voter_id: auth.user.id,
//           value,
//           created_at: now,
//         },
//         { onConflict: "product_id,review_author_id,voter_id" },
//       )
//       .select("value, created_at")
//       .maybeSingle();
//     if (voteErr) {
//       return json({ ok: false, code: "db" }, 500);
//     }

//     const { data: aggregateRows, error: aggregateErr } = await supabase
//       .from("review_votes")
//       .select("value, count:id")
//       .eq("product_id", resolvedProductId)
//       .eq("review_author_id", reviewAuthorId)
//       .group("value");
//     if (aggregateErr) {
//       return json({ ok: false, code: "db" }, 500);
//     }

//     let helpful = 0;
//     let notHelpful = 0;
//     if (Array.isArray(aggregateRows)) {
//       for (const entry of aggregateRows as Array<{ value: number | null; count: number | null }>) {
//         const currentValue = Number(entry?.value ?? 0);
//         const count = Number(entry?.count ?? 0);
//         if (!Number.isFinite(count)) continue;
//         if (currentValue === 1) {
//           helpful += count;
//         } else if (currentValue === -1) {
//           notHelpful += count;
//         }
//       }
//     }

//     try {
//       revalidateTag(`reviews:${resolvedProductId}`);
//     } catch {
//       // revalidation best effort
//     }

//     return json({
//       ok: true,
//       vote: {
//         value: voteRow?.value ?? value,
//         created_at: voteRow?.created_at ?? now,
//       },
//       totals: {
//         helpful,
//         notHelpful,
//         score: helpful - notHelpful,
//       },
//     });
//   } catch (error: any) {
//     return json(
//       { ok: false, code: "internal", message: String(error?.message ?? error) },
//       500,
//     );
//   }
// }

// export function GET() {
//   return json({ ok: false, code: "method_not_allowed" }, 405);
// }

"use server";

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function clampString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code === "PGRST302" || code === "42P01") return true;
  const message = error.message ?? "";
  return /schema cache/i.test(message) || /does not exist/i.test(message);
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "bad_json" }, 400);
  }

  const productId = clampString(payload.product_id, 36);
  const reviewAuthorId = clampString(payload.review_author_id, 36);
  const valueRaw = payload.value;

  if (!isUuid(productId)) {
    return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
  }
  if (!isUuid(reviewAuthorId)) {
    return json({ ok: false, code: "bad_request", message: "review_author_id invalid" }, 400);
  }
  if (reviewAuthorId === auth.user.id) {
    return json({ ok: false, code: "bad_request", message: "cannot vote on own review" }, 400);
  }

  const value = Number(valueRaw);
  if (!Number.isInteger(value) || (value !== 1 && value !== -1)) {
    return json({ ok: false, code: "bad_request", message: "value must be 1 or -1" }, 400);
  }

  try {
    const supabase = getAdminClient();

    // optional mapping через product_catalog, если он есть
    let productUid: string | null = null;
    const { data: catalogRow, error: catalogErr } = await supabase
      .from("product_catalog")
      .select("product_uid")
      .eq("source_schema", "public")
      .eq("source_table", "ecom_products")
      .eq("source_pk", productId)
      .maybeSingle();

    if (catalogErr) {
      if (!isMissingTableError(catalogErr)) {
        return json({ ok: false, code: "db" }, 500);
      }
    } else {
      productUid = (catalogRow?.product_uid as string | null) ?? null;
    }

    if (!productUid) productUid = productId;

    // проверим, что у автора есть approved-отзыв по этому продукту
    const { data: reviewRow, error: reviewErr } = await supabase
      .from("product_reviews_raw")
      .select("status, product_id")
      .eq("product_id", productUid)
      .eq("user_id", reviewAuthorId)
      .maybeSingle();

    if (reviewErr) {
      return json({ ok: false, code: "db" }, 500);
    }
    if (!reviewRow || reviewRow.status !== "approved") {
      return json({ ok: false, code: "not_found", message: "review not available" }, 404);
    }

    const resolvedProductId =
      typeof (reviewRow as any).product_id === "string" ? (reviewRow as any).product_id : productUid;

    const now = new Date().toISOString();

    // upsert голоса
    const { data: voteRow, error: voteErr } = await supabase
      .from("review_votes")
      .upsert(
        {
          product_id: resolvedProductId,
          review_author_id: reviewAuthorId,
          voter_id: auth.user.id,
          value,
          created_at: now,
        },
        { onConflict: "product_id,review_author_id,voter_id" }
      )
      .select("value, created_at")
      .maybeSingle();

    if (voteErr) {
      if (!isMissingTableError(voteErr)) return json({ ok: false, code: "db" }, 500);
      // если таблицы нет — считаем, что голос не поддерживается
      return json({ ok: false, code: "not_supported" }, 400);
    }

    // соберём агрегаты без .group()
    let helpful = 0;
    let notHelpful = 0;

    const { data: voteRows, error: aggregateErr } = await supabase
      .from("review_votes")
      .select("value")
      .eq("product_id", resolvedProductId)
      .eq("review_author_id", reviewAuthorId);

    if (aggregateErr) {
      if (!isMissingTableError(aggregateErr)) return json({ ok: false, code: "db" }, 500);
    } else if (Array.isArray(voteRows)) {
      for (const row of voteRows as Array<{ value: number | null }>) {
        if (row.value === 1) helpful += 1;
        else if (row.value === -1) notHelpful += 1;
      }
    }

    try {
      revalidateTag(`reviews:${resolvedProductId}`);
    } catch {
      /* best-effort */
    }

    return json({
      ok: true,
      vote: {
        value: voteRow?.value ?? value,
        created_at: voteRow?.created_at ?? now,
      },
      totals: {
        helpful,
        notHelpful,
        score: helpful - notHelpful,
      },
    });
  } catch (error: any) {
    return json(
      { ok: false, code: "internal", message: String(error?.message ?? error) },
      500
    );
  }
}

// Из-за "use server" экспорты должны быть async
export async function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
