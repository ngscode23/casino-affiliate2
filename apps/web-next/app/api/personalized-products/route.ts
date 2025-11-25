import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { loadProductsData } from "@/app/products/data";
import type { ProductFilters } from "@/app/products/data";
import { fetchUserProfile } from "@/lib/personalization/rank";

const EXPERIMENT_COOKIE = process.env.EXPERIMENT_COOKIE_NAME || "exp";

type Payload = {
  anon_id?: string;
  filters?: ProductFilters;
};

function parsePayload(body: unknown): Payload {
  if (body && typeof body === "object") {
    return body as Payload;
  }
  return {};
}

async function handleRequest(request: Request) {
  const headerStore = new Headers(await headers());

  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const parsed = parsePayload(body);
  const getCookie = (name: string): string | null => {
    const cookieHeader = headerStore.get("cookie") || "";
    const match = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  };

  const anonId = parsed.anon_id || getCookie("anon_id") || headerStore.get("x-anon-id") || null;
  const country = headerStore.get("x-geo-country") || headerStore.get("x-country") || null;
  const device = headerStore.get("x-device-class") || null;
  const experimentVariant = getCookie(EXPERIMENT_COOKIE) || headerStore.get("x-experiment-variant") || null;

  const profile = anonId ? await fetchUserProfile(anonId) : null;
  const { products, structuredData, categories, catalogName, totalCount, fetchError } = await loadProductsData(
    parsed.filters ?? {},
    {
      personalize: {
        profile,
        country: country ?? undefined,
        device: device ?? undefined,
        experimentVariant: experimentVariant ?? undefined,
      },
    },
  );

  if (fetchError) {
    return NextResponse.json({ ok: false, error: String((fetchError as any)?.message ?? fetchError) }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      personalized: Boolean(profile && !profile.opt_out),
      products,
      profile,
      meta: { categories, catalogName, totalCount, experimentVariant },
      structuredData,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  return handleRequest(request);
}

export async function GET(request: Request) {
  return handleRequest(request);
}
