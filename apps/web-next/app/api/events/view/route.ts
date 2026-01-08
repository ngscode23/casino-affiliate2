import { cookies } from "next/headers";

import { json } from "@/app/api/orders/utils";
import { resolveViewerIdentity } from "@/utils/auth/viewer";
import { getAdminClient } from "@/utils/supabase/admin";

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const ANON_COOKIE = "aid";
const LEGACY_ANON_COOKIE = "anon_id";
const ANON_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type ViewEventBody = {
  productId?: string;
  optOut?: boolean;
};

function resolveAnonId(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const primary = cookieStore.get(ANON_COOKIE)?.value ?? null;
  const legacy = cookieStore.get(LEGACY_ANON_COOKIE)?.value ?? null;
  const candidate = primary ?? legacy ?? null;

  if (!candidate || !UUID_PATTERN.test(candidate)) {
    const anonId = crypto.randomUUID();
    return { anonId, setAid: true, setLegacy: true };
  }

  return {
    anonId: candidate,
    setAid: !primary,
    setLegacy: !legacy,
  };
}

function withAnonCookies(
  response: ReturnType<typeof json>,
  anonId: string,
  setAid: boolean,
  setLegacy: boolean,
) {
  if (setAid) {
    response.cookies.set({
      name: ANON_COOKIE,
      value: anonId,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: ANON_MAX_AGE_SECONDS,
    });
  }
  if (setLegacy) {
    response.cookies.set({
      name: LEGACY_ANON_COOKIE,
      value: anonId,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: ANON_MAX_AGE_SECONDS,
    });
  }
  return response;
}

export async function POST(request: Request) {
  let body: ViewEventBody;
  try {
    body = (await request.json()) as ViewEventBody;
  } catch {
    return json({ ok: false, code: "invalid_body", message: "Invalid JSON body" }, 400);
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (!UUID_PATTERN.test(productId)) {
    return json({ ok: false, code: "invalid_product_id", message: "productId must be a valid UUID" }, 400);
  }

  const optOut = Boolean(body.optOut);
  if (optOut) {
    return json({ ok: true, skipped: true }, 200);
  }

  const cookieStore = await cookies();
  const identity = resolveViewerIdentity(cookieStore);
  const { anonId, setAid, setLegacy } = resolveAnonId(cookieStore);
  const userId = identity.userId && UUID_PATTERN.test(identity.userId) ? identity.userId : null;

  try {
    const admin = getAdminClient();
    const logRes = await admin.rpc("log_catalog_view_event", {
      p_anon_id: anonId,
      p_user_id: userId,
      p_product_id: productId,
    });

    if (logRes.error) {
      console.warn?.("[events:view] write failed", {
        insertError: logRes.error?.message,
        productId,
        anonId,
      });
      return withAnonCookies(
        json(
          {
            ok: false,
            code: "db_error",
            message: logRes.error?.message ?? "Failed to write view event",
          },
          500,
        ),
        anonId,
        setAid,
        setLegacy,
      );
    }

    return withAnonCookies(json({ ok: true }, 200), anonId, setAid, setLegacy);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error?.("[events:view] unexpected error", { message, productId, anonId });
    return withAnonCookies(json({ ok: false, code: "unexpected", message }, 500), anonId, setAid, setLegacy);
  }
}
