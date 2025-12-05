import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client with forwarded auth cookies (Next 16: cookies() is async).
 */
async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

function authRequired() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return authRequired();

  const { data, error } = await supabase
    .from("user_favorites")
    .select("product_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return authRequired();

  const body = (await request.json().catch(() => ({}))) as { product_id?: string };
  const productId = typeof body.product_id === "string" ? body.product_id.trim() : "";
  if (!productId) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 });
  }

  const { error } = await supabase.from("user_favorites").upsert(
    {
      user_id: user.id,
      product_id: productId,
    },
    { onConflict: "user_id,product_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // log activity (best-effort)
  try {
    await supabase.from("user_activity").insert({
      user_id: user.id,
      product_id: productId,
      type: "favorite_add",
      payload: { source: "api/account/favorites" },
    });
  } catch {
    /* ignore logging error */
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return authRequired();

  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id")?.trim() ?? "";
  if (!productId) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await supabase.from("user_activity").insert({
      user_id: user.id,
      product_id: productId,
      type: "favorite_remove",
      payload: { source: "api/account/favorites" },
    });
  } catch {
    /* ignore logging error */
  }
  return NextResponse.json({ ok: true });
}
