// netlify/functions/customer-portal.ts
import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string | undefined;
const SITE_ORIGIN = process.env.VITE_SITE_URL || process.env.SITE_ORIGIN || process.env.SITE_URL || "";

export const handler: Handler = async (event) => {
  try {
    if (!STRIPE_SECRET_KEY) return { statusCode: 500, body: "Stripe not configured" };
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);
    const body = JSON.parse(event.body || "{}") as { email: string };
    const email = String(body.email || "").trim();
    if (!email) return { statusCode: 400, body: "email required" };
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data?.[0];
    if (!customer) return { statusCode: 404, body: "customer not found" };

    const returnUrl = (process.env.STRIPE_CUSTOMER_PORTAL_URL && String(process.env.STRIPE_CUSTOMER_PORTAL_URL).trim())
      ? String(process.env.STRIPE_CUSTOMER_PORTAL_URL).trim()
      : `${String(SITE_ORIGIN).replace(/\/$/, "")}/admin/partners`;
    const session = await stripe.billingPortal.sessions.create({ customer: customer.id, return_url: returnUrl });
    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (e: any) {
    return { statusCode: 500, body: String(e?.message || e) };
  }
};

export default handler;
