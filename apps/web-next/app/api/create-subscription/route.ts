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

type PlanName = "BASIC" | "FEATURED" | "TOP";
type Interval = "MONTHLY" | "YEARLY";

type SubscriptionPayload = {
  email?: string;
  plan?: string;
  interval?: string;
  offerSlugs?: string[];
  coupon?: string;
};

const PRICE_MAP: Record<Interval, Record<PlanName, string>> = {
  MONTHLY: {
    BASIC: process.env.STRIPE_PRICE_BASIC_MONTHLY || "",
    FEATURED: process.env.STRIPE_PRICE_FEATURED_MONTHLY || "",
    TOP: process.env.STRIPE_PRICE_TOP_MONTHLY || "",
  },
  YEARLY: {
    BASIC: process.env.STRIPE_PRICE_BASIC_YEARLY || "",
    FEATURED: process.env.STRIPE_PRICE_FEATURED_YEARLY || "",
    TOP: process.env.STRIPE_PRICE_TOP_YEARLY || "",
  },
};

function normalizePlan(value: unknown): PlanName {
  const plan = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (plan === "FEATURED" || plan === "TOP") return plan;
  return "BASIC";
}

function normalizeInterval(value: unknown): Interval {
  const interval = typeof value === "string" ? value.trim().toUpperCase() : "";
  return interval === "YEARLY" ? "YEARLY" : "MONTHLY";
}

export async function POST(request: Request) {
  try {
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
    }

    const payload = (await request.json().catch(() => ({}))) as SubscriptionPayload;
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    if (!email) {
      return NextResponse.json({ error: "email_required" }, { status: 400 });
    }

    const plan = normalizePlan(payload.plan);
    const interval = normalizeInterval(payload.interval);
    const price = PRICE_MAP[interval][plan];
    if (!price) {
      return NextResponse.json({ error: "price_not_configured" }, { status: 400 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);

    const existing = await stripe.customers.list({ email, limit: 1 });
    let customerId = existing.data?.[0]?.id;
    if (!customerId) {
      const created = await stripe.customers.create({ email });
      customerId = created.id;
    }

    const siteOrigin = resolveSiteOrigin(request);
    const successUrl = siteOrigin ? `${siteOrigin}/admin/partners?status=success` : `/admin/partners?status=success`;
    const cancelUrl = siteOrigin ? `${siteOrigin}/admin/partners?status=cancel` : `/admin/partners?status=cancel`;

    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (payload.coupon) {
      const code = payload.coupon.trim();
      if (code) {
        try {
          if (/^promo_/i.test(code) || /^promocode_/i.test(code)) {
            discounts = [{ promotion_code: code }];
          } else if (/^coupon_/i.test(code)) {
            discounts = [{ coupon: code }];
          } else {
            const promos = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
            const promo = promos.data?.[0];
            if (promo) {
              discounts = [{ promotion_code: promo.id }];
            }
          }
        } catch {
          // ignore invalid coupon values
        }
      }
    }

    const offerSlugs = Array.isArray(payload.offerSlugs)
      ? payload.offerSlugs.map((slug) => String(slug)).filter(Boolean)
      : [];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price, quantity: 1 }],
      discounts,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan,
        interval,
        email,
        offer_slugs: offerSlugs.join(","),
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
