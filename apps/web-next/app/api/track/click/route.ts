import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";

type Dataset = "shop" | "legacy";
const DEBUG = process.env.TRACK_DEBUG === "1";

type ClickPayload = {
  product_id: string;
  ip?: string;
  user_agent?: string;
  referrer?: string;
  session_id?: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawProductId = typeof body?.product_id === "string" ? body.product_id.trim() : "";
  const dataset: Dataset = body?.dataset === "legacy" ? "legacy" : "shop";

  if (!rawProductId) {
    return NextResponse.json({ ok: false, error: "product_id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const h = await headers();
  const payload: ClickPayload = {
    product_id: rawProductId,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    user_agent: h.get("user-agent") || undefined,
    referrer: h.get("referer") || undefined,
    session_id: undefined,
  };
  // Prepare meta params for RPC signature variants
  const ip = payload.ip;
  const ua = payload.user_agent;
  const meta = { ip, user_agent: ua, referrer: payload.referrer, session_id: payload.session_id };

  // Try several common signatures (order keeps unit tests stable)
  const attempts: Array<Record<string, unknown>> = [
    // modern names
    { product_id: rawProductId, params: meta },
    { product_id: rawProductId, referrer: payload.referrer, params: meta },
    // prefixed param names (p_*)
    { p_product_id: rawProductId, p_params: meta, p_referrer: payload.referrer },
    // legacy positional-like named params
    { ip, product_id: rawProductId, referrer: payload.referrer, user_agent: ua },
  ];

  // Try to resolve slug by product_id for broader RPC compatibility (both legacy and current tables)
  let resolvedSlug: string | null = null;
  const tryResolve = async (table: string) => {
    try {
      const { data } = await supabase
        .from(table)
        .select("id, slug")
        .eq("id", rawProductId)
        .limit(1)
        .maybeSingle();
      const cand = (data as any)?.slug;
      if (typeof cand === "string" && cand.trim()) return cand.trim();
    } catch { /* ignore */ }
    return null;
  };
  resolvedSlug = (await tryResolve("ecom_products")) ?? (await tryResolve("products"));

  // Optionally try slug if present in payload or resolved from DB
  const maybeSlug = (payload as any).slug ?? resolvedSlug;
  if (typeof maybeSlug === "string" && maybeSlug.trim()) {
    attempts.push(
      { slug: maybeSlug, params: meta, referrer: payload.referrer },
      { p_slug: maybeSlug, p_params: meta, p_referrer: payload.referrer },
    );
  }

  let attemptIndex = 0;
  let lastError: { code?: string | null; message?: string } | null = null;

  for (const args of attempts) {
    attemptIndex += 1;
    try {
      const { error } = await supabase.rpc("log_click", args as any);
      if (!error) return NextResponse.json({ ok: true });
      lastError = { code: error.code, message: error.message };
      if (DEBUG) {
        console.warn("[track:click]", {
          attempt: attemptIndex,
          code: error.code ?? "unknown",
          message: error.message ?? "rpc_error",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = { code: "exception", message };
      if (DEBUG) {
        console.warn("[track:click]", {
          attempt: attemptIndex,
          code: "exception",
          message,
        });
      }
    }
  }

  const responseInit: ResponseInit = { status: 500 };
  if (DEBUG && lastError) {
    const normalizedMessage = String(lastError.message ?? "unknown").replace(/\s+/g, " ").trim();
    responseInit.headers = {
      "x-track-debug": `${lastError.code ?? "unknown"}:${normalizedMessage}`,
    };
  }

  return NextResponse.json(
    { ok: false, error: "Failed to record click (RPC mismatch/permission)" },
    responseInit
  );
}





