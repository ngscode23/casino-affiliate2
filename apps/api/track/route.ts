import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // только серверный env

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function POST(req: Request) {
  try {
    const { test, variant, event, props, ts, href } = await req.json();
    if (!test || !variant || !event) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }
    const { error } = await supabase.from("ab_events").insert({
      test,
      variant,
      event,
      props: props ?? {},
      href: href ?? null,
      ts: ts ? new Date(ts).toISOString() : new Date().toISOString(),
    });
    if (error) {
      console.warn("ab_events insert error", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.warn("ab track error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}