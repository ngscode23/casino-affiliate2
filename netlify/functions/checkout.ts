// netlify/functions/checkout.ts
import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string | undefined;
// Prefer explicitly provided site URL; fall back to SITE_ORIGIN/SITE_URL
const SITE_ORIGIN =
  process.env.VITE_SITE_URL || process.env.SITE_ORIGIN || process.env.SITE_URL || "";

export const handler: Handler = async (event) => {
  try {
    if (!STRIPE_SECRET_KEY) return { statusCode: 500, body: "Stripe not configured" };
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);
    const body = JSON.parse(event.body || "{}");
    const { name, email, plan = "BASIC", days = 30, offerSlugs = [] } = body || {};

    const priceMap: Record<string, string> = {
      BASIC: process.env.STRIPE_PRICE_BASIC || "",
      FEATURED: process.env.STRIPE_PRICE_FEATURED || "",
      TOP: process.env.STRIPE_PRICE_TOP || "",
    };
    const price = priceMap[plan] || priceMap.BASIC;
    if (!price) return { statusCode: 400, body: "Plan price not configured" };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price, quantity: 1 }],
      success_url: `${SITE_ORIGIN.replace(/\/$/, "")}/admin/partners?status=success`,
      cancel_url: `${SITE_ORIGIN.replace(/\/$/, "")}/admin/partners?status=cancel`,
      customer_email: email,
      metadata: {
        // Support both legacy and generic keys
        partner_name: String(name || "Unknown"),
        partner_email: String(email || ""),
        plan: String(plan),
        duration_days: String(days),
        offer_slugs: Array.isArray(offerSlugs) ? (offerSlugs as string[]).join(",") : String(offerSlugs || ""),
        // Generic
        name: String(name || "Unknown"),
        email: String(email || ""),
        days: String(days),
        offerSlugs: Array.isArray(offerSlugs) ? (offerSlugs as string[]).join(",") : String(offerSlugs || ""),
      },
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (e: any) {
    return { statusCode: 500, body: String(e?.message || e) };
  }
};

export default handler;
