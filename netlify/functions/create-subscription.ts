// netlify/functions/create-subscription.ts
import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string | undefined;
const SITE_ORIGIN = process.env.VITE_SITE_URL || process.env.SITE_ORIGIN || process.env.SITE_URL || "";

const PRICE_MAP: Record<string, Record<string, string>> = {
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

export const handler: Handler = async (event) => {
  try {
    if (!STRIPE_SECRET_KEY) return { statusCode: 500, body: "Stripe not configured" };
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);
    const body = JSON.parse(event.body || "{}") as {
      email: string;
      plan: "BASIC" | "FEATURED" | "TOP";
      interval: "MONTHLY" | "YEARLY";
      offerSlugs?: string[];
      coupon?: string;
    };
    const email = String(body.email || "").trim();
    const plan = String(body.plan || "BASIC").toUpperCase() as any;
    const interval = String(body.interval || "MONTHLY").toUpperCase() as any;
    const price = PRICE_MAP?.[interval]?.[plan] || "";
    if (!email) return { statusCode: 400, body: "email required" };
    if (!price) return { statusCode: 400, body: "price not configured" };

    // Ensure customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    let customerId = existing.data?.[0]?.id;
    if (!customerId) {
      const c = await stripe.customers.create({ email });
      customerId = c.id;
    }

    const success = `${String(SITE_ORIGIN).replace(/\/$/, "")}/admin/partners?status=success`;
    const cancel = `${String(SITE_ORIGIN).replace(/\/$/, "")}/admin/partners?status=cancel`;

    // Resolve discount via promotion code if provided
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined = undefined;
    if (body.coupon) {
      try {
        const code = String(body.coupon).trim();
        if (/^promo_/.test(code) || /^promocode_/.test(code)) {
          discounts = [{ promotion_code: code }];
        } else if (/^coupon_/.test(code)) {
          discounts = [{ coupon: code }];
        } else {
          const promos = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
          const promo = promos.data?.[0];
          if (promo) discounts = [{ promotion_code: promo.id }];
        }
      } catch { /* ignore bad coupon */ }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price, quantity: 1 }],
      discounts,
      success_url: success,
      cancel_url: cancel,
      metadata: {
        plan,
        interval,
        email,
        offer_slugs: Array.isArray(body.offerSlugs) ? body.offerSlugs.join(",") : "",
      },
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (e: any) {
    return { statusCode: 500, body: String(e?.message || e) };
  }
};

export default handler;
