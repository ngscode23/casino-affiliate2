import { NextResponse } from "next/server";
import { getActiveBanners } from "@/lib/banners";

export const revalidate = 300;

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=60";

export async function GET() {
  try {
    const banners = await getActiveBanners();
    return NextResponse.json(
      {
        ok: true,
        count: banners.length,
        banners,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "cache-control": CACHE_CONTROL,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "internal_error",
        message: error instanceof Error ? error.message : "Failed to load banners",
      },
      {
        status: 500,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}

