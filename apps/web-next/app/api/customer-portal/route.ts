import Stripe from "stripe";
import { NextResponse } from "next/server";

function pickEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function buildReturnUrl(request: Request) {
  const explicit = pickEnv("STRIPE_CUSTOMER_PORTAL_URL");
  if (explicit) return explicit;
  const siteOrigin = pickEnv(
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_APP_URL",
    "SITE_ORIGIN",
    "SITE_URL",
    "VITE_SITE_URL"
  );
  const base = siteOrigin || request.headers.get("origin") || "";
  if (!base) return "/admin/partners";
  return `${base.replace(/\/$/, "")}/admin/partners`;
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export async function POST(request: Request) {
  try {
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);
    const payload = await request.json().catch(() => ({}));
    const email = typeof payload?.email === "string" ? payload.email.trim() : "";
    if (!email) {
      return NextResponse.json({ error: "email_required" }, { status: 400 });
    }

    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data?.[0];
    if (!customer) {
      return NextResponse.json({ error: "customer_not_found" }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: buildReturnUrl(request),
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
