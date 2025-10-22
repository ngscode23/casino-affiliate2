import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";

type Dataset = "shop" | "legacy";
const DEBUG = process.env.TRACK_DEBUG === "1";

type ImpressionPayload = {
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

  const fetchProduct = async (): Promise<{ exists: boolean; slug: string | null }> => {
    const tables = dataset === "legacy"
      ? ["legacy_products", "products"]
      : ["products"];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("id, slug")
          .eq("id", rawProductId)
          .limit(1)
          .maybeSingle();

        if (error) continue;
        if (data) {
          return { exists: true, slug: (data as any)?.slug ?? null };
        }
      } catch {
        // ignore and try next table
      }
    }

    return { exists: false, slug: null };
  };

  const { exists, slug } = await fetchProduct();
  if (!exists) {
    return NextResponse.json({ ok: true, recorded: false, reason: "unknown_product" });
  }

  const h = await headers();
  const payload: ImpressionPayload = {
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

  // Try common RPC signatures to be resilient to deployed SQL (order keeps tests stable)
  const attempts: Array<Record<string, unknown>> = [
    // modern names
    { product_id: rawProductId, params: meta },
    { product_id: rawProductId, referrer: payload.referrer, params: meta },
    // prefixed param names (p_*)
    { p_product_id: rawProductId, p_params: meta, p_referrer: payload.referrer },
    // legacy positional-like named params
    { ip, product_id: rawProductId, referrer: payload.referrer, user_agent: ua },
  ];

  if (slug) {
    attempts.push(
      { slug, params: meta },
      { slug, referrer: payload.referrer, params: meta },
      { p_slug: slug, p_params: meta, p_referrer: payload.referrer },
    );
  }

  let attemptIndex = 0;
  let lastError: { code?: string | null; message?: string } | null = null;

  for (const args of attempts) {
    attemptIndex += 1;
    try {
      const { error } = await supabase.rpc("log_impression", args as any);
      if (!error) return NextResponse.json({ ok: true });
      lastError = { code: error.code, message: error.message };
      if (DEBUG) {
        console.warn("[track:impression]", {
          attempt: attemptIndex,
          code: error.code ?? "unknown",
          message: error.message ?? "rpc_error",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = { code: "exception", message };
      if (DEBUG) {
        console.warn("[track:impression]", {
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
    { ok: false, error: "Failed to record impression (RPC mismatch/permission)" },
    responseInit
  );
}






