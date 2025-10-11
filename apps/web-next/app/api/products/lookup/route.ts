import { NextResponse } from "next/server";
import { fetchProductsBySlugs } from "@/app/products/[slug]/data";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slugsParam = url.searchParams.get("slugs") ?? "";
    const limitParam = url.searchParams.get("limit");
    const list = slugsParam
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!list.length) {
      return NextResponse.json({ ok: true, items: [] });
    }
    const limit = Math.min(Math.max(parseInt(limitParam ?? "8", 10) || 8, 1), 16);
    const items = await fetchProductsBySlugs(list, limit);
    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, code: "internal", message: String(error?.message ?? error) },
      { status: 500 },
    );
  }
}
