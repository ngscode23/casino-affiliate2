import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const CLICK_TABLES = ["shop_clicks", "product_clicks"] as const;

type Dataset = "shop" | "legacy";

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
  let lastError: unknown = null;

  const tables =
    dataset === "legacy"
      ? (["product_clicks", "shop_clicks"] as const)
      : CLICK_TABLES;

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
      ? String((lastError as { message?: unknown }).message ?? "Failed to record click")
      : "Failed to record click";

  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}





