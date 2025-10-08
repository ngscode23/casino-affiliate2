import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function normalize(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function POST(request: Request) {
  const form = await request.formData();
  const fullName = normalize(form.get("name"));
  const email = normalize(form.get("email"));
  const message = normalize(form.get("message"));

  const redirectUrl = new URL(request.url);
  redirectUrl.pathname = "/contact";
  redirectUrl.search = "";

  if (!email || !message) {
    redirectUrl.searchParams.set("error", "missing-fields");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("contact_messages")
      .insert({
        full_name: fullName || null,
        email,
        message,
        metadata: {
          userAgent: request.headers.get("user-agent") ?? undefined,
          referer: request.headers.get("referer") ?? undefined,
        },
      });

    if (error) {
      redirectUrl.searchParams.set("error", "storage-failed");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    redirectUrl.searchParams.set("success", "1");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch {
    redirectUrl.searchParams.set("error", "unknown");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}
