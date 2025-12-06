import { NextResponse } from "next/server";
import { HERO_TAG, getActiveHero } from "@/lib/hero";

export const dynamic = "force-static";
export const revalidate = 300;
export const fetchCache = "default-cache";
export const runtime = "nodejs";

export async function GET() {
  const hero = await getActiveHero();
  return NextResponse.json({ hero });
}
