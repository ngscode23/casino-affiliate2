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

  // Prefer stable anon_id cookie for event attribution. If missing/invalid, fall back to userId (when available)
  // or generate a new UUID and persist it as anon_id.
  const hasValidAnon = anonId && UUID_PATTERN.test(anonId);
  if (!hasValidAnon) {
    anonId = userId && UUID_PATTERN.test(userId) ? userId : crypto.randomUUID();
    shouldSetAnonCookie = true;
  }

  const weightRaw = Number(body.weight ?? RECENT_WEIGHT_DEFAULT);
  const weight = Number.isFinite(weightRaw) && weightRaw > 0 ? Math.min(weightRaw, 100) : RECENT_WEIGHT_DEFAULT;
  const supabase = getAdminClient();
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
    if (!anonId) {
      return json({ ok: false, code: "anon_missing", message: "Unable to resolve anonymous identity" }, 400);
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("opt_out")
      .eq("anon_id", anonId)
      .maybeSingle();

    if (profileError) {
      return withAnonCookie(json({ ok: false, code: "db_error", message: profileError.message }, 500));
    }

    if (profile?.opt_out) {
      return withAnonCookie(json({ ok: false, opt_out: true }, 403));
    }

    const { error } = await supabase.from("user_events").insert({
      anon_id: anonId,
      event: "view",
      product_id: productId,
      weight,
      metadata: { source: "api/recent-views", user_id: userId },
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
