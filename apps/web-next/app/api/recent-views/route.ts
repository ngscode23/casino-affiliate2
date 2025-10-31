import { cookies } from "next/headers";

import { json } from "@/app/api/orders/utils";
import { getAdminClient } from "@/utils/supabase/admin";
import { resolveViewerIdentity } from "@/utils/auth/viewer";

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const RECENT_WEIGHT_DEFAULT = 1;
const ANON_COOKIE = "anon_id";
const ANON_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type RecordRecentViewBody = {
  productId?: string;
  weight?: number;
};

export async function POST(request: Request) {
  let body: RecordRecentViewBody;
  try {
    body = (await request.json()) as RecordRecentViewBody;
  } catch {
    return json({ ok: false, code: "invalid_body", message: "Invalid JSON body" }, 400);
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (!UUID_PATTERN.test(productId)) {
    return json({ ok: false, code: "invalid_product_id", message: "productId must be a valid UUID" }, 400);
  }

  const cookieStore = await cookies();
  const identity = resolveViewerIdentity(cookieStore);

  const userId = identity.userId;
  let anonId = identity.anonId;
  let shouldSetAnonCookie = false;

  if (!userId && !anonId) {
    anonId = crypto.randomUUID();
    shouldSetAnonCookie = true;
  }

  const weightRaw = Number(body.weight ?? RECENT_WEIGHT_DEFAULT);
  const weight = Number.isFinite(weightRaw) && weightRaw > 0 ? Math.min(weightRaw, 100) : RECENT_WEIGHT_DEFAULT;
  const supabase = getAdminClient();
  const now = new Date().toISOString();
  const withAnonCookie = (response: ReturnType<typeof json>) => {
    if (shouldSetAnonCookie && anonId) {
      response.cookies.set({
        name: ANON_COOKIE,
        value: anonId,
        path: "/",
        maxAge: ANON_MAX_AGE_SECONDS,
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      });
    }
    return response;
  };

  try {
    if (userId) {
      if (anonId) {
        const { error: mergeError } = await supabase.rpc("merge_recent_views", { _anon_id: anonId, _user_id: userId });
        if (mergeError) {
          console.warn("merge_recent_views RPC failed", mergeError);
        }
      }
      await supabase.from("recent_views").delete().eq("user_id", userId).eq("product_id", productId);
      const { error } = await supabase.from("recent_views").insert({
        user_id: userId,
        product_id: productId,
        seen_at: now,
        weight,
      });
      if (error) {
        return json({ ok: false, code: "insert_failed", message: error.message }, 500);
      }
      return withAnonCookie(json({ ok: true }, 200));
    }

    if (!anonId) {
      return json({ ok: false, code: "anon_missing", message: "Unable to resolve anonymous identity" }, 400);
    }

    await supabase.from("recent_views").delete().eq("anon_id", anonId).eq("product_id", productId);
    const { error } = await supabase.from("recent_views").insert({
      anon_id: anonId,
      product_id: productId,
      seen_at: now,
      weight,
    });
    if (error) {
      return json({ ok: false, code: "insert_failed", message: error.message }, 500);
    }
    return withAnonCookie(json({ ok: true }, 200));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ ok: false, code: "unexpected", message }, 500);
  }
}
