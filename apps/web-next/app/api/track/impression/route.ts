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
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawProductId = typeof body?.product_id === "string" ? body.product_id.trim() : "";
  const dataset: Dataset = body?.dataset === "legacy" ? "legacy" : "shop";

  if (!rawProductId) {
    return NextResponse.json({ ok: false, error: "product_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const fetchProduct = async (): Promise<boolean> => {
    const tables = dataset === "legacy"
      ? ["legacy_products", "products"]
      : ["products"];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("id")
          .eq("id", rawProductId)
          .limit(1)
          .maybeSingle();

        if (error) continue;
        if (data) {
          return true;
        }
      } catch {
        // ignore and try next table
      }
    }

    return false;
  };

  const exists = await fetchProduct();
  if (!exists) {
    return NextResponse.json({ ok: true, recorded: false, reason: "unknown_product" });
  }

  const h = await headers();
  const payload: ImpressionPayload = {
    product_id: rawProductId,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    user_agent: h.get("user-agent") || undefined,
    referrer: h.get("referer") || undefined,
  };

  try {
    const rpcArgs = {
      product_id: rawProductId,
      ip: payload.ip ?? null,
      referrer: payload.referrer ?? null,
      user_agent: payload.user_agent ?? null,
    };
    const { error } = await supabase.rpc("log_impression_v1", rpcArgs);
    if (error) {
      if (DEBUG) {
        console.warn("[track:impression]", {
          code: error.code ?? "unknown",
          message: error.message ?? "rpc_error",
        });
      }
      return NextResponse.json(
        { ok: false, error: "Failed to record impression (RPC error)" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (DEBUG) {
      console.warn("[track:impression]", {
        code: "exception",
        message,
      });
    }
    return NextResponse.json(
      { ok: false, error: "Failed to record impression (exception)" },
      { status: 500 },
    );
  }
}

