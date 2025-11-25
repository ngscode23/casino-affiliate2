import { NextResponse } from "next/server";
import { revalidate as revalidateTag } from "@/lib/cache";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const tag = url.searchParams.get("tag");
  const secret = url.searchParams.get("secret") ?? req.headers.get("x-revalidate-secret");
  const requiredSecret = process.env.REVALIDATE_SECRET;

  if (requiredSecret && secret !== requiredSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!tag) {
    return NextResponse.json({ error: "missing tag" }, { status: 400 });
  }

  try {
    await revalidateTag(tag);
    return NextResponse.json({ revalidated: true, tag });
  } catch (error) {
    console.error("[revalidate] failed", error);
    return NextResponse.json({ error: "failed", tag }, { status: 500 });
  }
}
