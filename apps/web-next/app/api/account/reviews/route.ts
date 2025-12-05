import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
    .from("user_reviews")
    .select("id, product_id, rating, title, body, status, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

type ReviewPayload = {
  product_id?: string;
  rating?: number;
  title?: string | null;
  body?: string | null;
  id?: string | null;
};

function validateReview(input: ReviewPayload): string | null {
  const productId = typeof input.product_id === "string" ? input.product_id.trim() : "";
  if (!productId) return "product_id required";
  const rating = Number(input.rating ?? 0);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return "rating must be 1-5";
  const title = input.title && input.title.trim();
  const body = input.body && input.body.trim();
  if (!title && !body) return "title or body required";
  if ((title?.length ?? 0) > 200) return "title too long";
  if ((body?.length ?? 0) > 4000) return "body too long";
  return null;
}

export async function POST(request: Request) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return authRequired();

  const payload = (await request.json().catch(() => ({}))) as ReviewPayload;
  const errorText = validateReview(payload);
  if (errorText) return NextResponse.json({ error: errorText }, { status: 400 });

  const productId = payload.product_id!.trim();
  const rating = Number(payload.rating);
  const title = payload.title?.trim() || null;
  const body = payload.body?.trim() || null;

  const { data, error } = await supabase
    .from("user_reviews")
    .upsert(
      {
        id: payload.id ?? undefined,
        user_id: user.id,
        product_id: productId,
        rating,
        title,
        body,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id, product_id, rating, title, body, status, created_at, updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
