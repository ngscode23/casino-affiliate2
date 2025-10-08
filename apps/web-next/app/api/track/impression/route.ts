import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const IMPRESSION_TABLES = ["shop_impressions", "product_impressions"] as const;

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

  const productExists = async () => {
    if (dataset === "legacy") {
      const { data } = await supabase
        .from("products")
        .select("id")
        .eq("id", rawProductId)
        .limit(1)
        .maybeSingle();
      return !!data;
    }
    const { data } = await supabase
      .from("ecom_products")
      .select("id")
      .eq("id", rawProductId)
      .limit(1)
      .maybeSingle();
    return !!data;
  };

  if (!(await productExists())) {
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
  let lastError: unknown = null;

  const tables =
    dataset === "legacy"
      ? (["product_impressions", "shop_impressions"] as const)
      : IMPRESSION_TABLES;

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).insert(payload);
      if (!error) {
        return NextResponse.json({ ok: true });
      }
      if (typeof error === "object" && error && "message" in error) {
        const message = String((error as { message?: unknown }).message ?? "");
        if (message.toLowerCase().includes("permission denied")) {
          continue;
        }
      }
      lastError = error;
    } catch (error) {
      if (typeof error === "object" && error && "message" in error) {
        const message = String((error as { message?: unknown }).message ?? "");
        if (message.toLowerCase().includes("permission denied")) {
          continue;
        }
      }
      lastError = error;
    }
  }
  if (!lastError) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const message =
    typeof lastError === "object" && lastError && "message" in lastError
      ? String((lastError as { message?: unknown }).message ?? "Failed to record impression")
      : "Failed to record impression";

  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}






