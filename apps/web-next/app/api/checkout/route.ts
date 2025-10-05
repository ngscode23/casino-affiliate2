import Stripe from "stripe";
import { NextResponse } from "next/server";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

function pickEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function resolveSiteOrigin(request: Request): string {
  const explicit = pickEnv(
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_APP_URL",
    "SITE_ORIGIN",
    "SITE_URL",
    "VITE_SITE_URL",
  );
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const fallback = request.headers.get("origin") ?? "";
  return fallback.replace(/\/$/, "");
}

function normalizePlan(value: unknown): "BASIC" | "FEATURED" | "TOP" {
  const plan = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (plan === "FEATURED" || plan === "TOP") return plan;
  return "BASIC";
}

function normalizeDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 30;
  return Math.min(Math.max(Math.round(parsed), 1), 365);
}

function extractOfferSlugs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean);
  }
  return [];
}

export async function POST(request: Request) {
  try {
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);
    const body = await request.json().catch(() => ({}));

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const plan = normalizePlan(body?.plan);
    const days = normalizeDays(body?.days);
    const offerSlugs = extractOfferSlugs(body?.offerSlugs);

    const priceMap: Record<"BASIC" | "FEATURED" | "TOP", string> = {
      BASIC: process.env.STRIPE_PRICE_BASIC || "",
      FEATURED: process.env.STRIPE_PRICE_FEATURED || "",
      TOP: process.env.STRIPE_PRICE_TOP || "",
    };

    const price = priceMap[plan] || priceMap.BASIC;
    if (!price) {
      return NextResponse.json({ error: "plan_not_configured" }, { status: 400 });
    }

    const siteOrigin = resolveSiteOrigin(request);
    const successUrl = siteOrigin ? `${siteOrigin}/admin/partners?status=success` : `/admin/partners?status=success`;
    const cancelUrl = siteOrigin ? `${siteOrigin}/admin/partners?status=cancel` : `/admin/partners?status=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email || undefined,
      metadata: {
        partner_name: name || "Unknown",
        partner_email: email,
        plan,
        duration_days: String(days),
        offer_slugs: offerSlugs.join(","),
        name: name || "Unknown",
        email,
        days: String(days),
        offerSlugs: offerSlugs.join(","),
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message ?? error) }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
