import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";

type Dataset = "shop" | "legacy";

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
    if (dataset === "legacy") {
      const { data } = await supabase
        .from("products")
        .select("id, slug")
        .eq("id", rawProductId)
        .limit(1)
        .maybeSingle();
      return { exists: !!data, slug: (data as any)?.slug ?? null };
    }
    const { data } = await supabase
      .from("ecom_products")
      .select("id, slug")
      .eq("id", rawProductId)
      .limit(1)
      .maybeSingle();
    return { exists: !!data, slug: (data as any)?.slug ?? null };
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

  for (const args of attempts) {
    try {
      const { error } = await supabase.rpc("log_impression", args as any);
      if (!error) return NextResponse.json({ ok: true });
      // if error – try next signature
      // eslint-disable-next-line no-continue
      continue;
    } catch {
      // try next signature
      // eslint-disable-next-line no-continue
      continue;
    }
  }

  return NextResponse.json({ ok: false, error: "Failed to record impression (RPC mismatch/permission)" }, { status: 500 });
}






