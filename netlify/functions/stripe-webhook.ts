// netlify/functions/stripe-webhook.ts
import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string | undefined;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string | undefined;
const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const handler: Handler = async (event) => {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return { statusCode: 500, body: "Stripe not configured" };
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: "Supabase not configured" };
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);

  try {
    const sig = event.headers["stripe-signature"] as string;
    // Ensure we pass the exact raw request body to Stripe (handle base64-encoded bodies)
    const body = event.isBase64Encoded && event.body
      ? Buffer.from(event.body, "base64").toString("utf8")
      : (event.body || "");
    const evt = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);

    if (evt.type === "checkout.session.completed") {
      const session = evt.data.object as Stripe.Checkout.Session;
      const md = (session.metadata || {}) as any;
      const name = String(md.partner_name || md.name || "Unknown");
      const email = String(md.partner_email || md.email || session.customer_details?.email || "");
      const plan = String(md.plan || "BASIC");
      const days = Number(md.duration_days || md.days || 30);
      const offerSlugs = String(md.offer_slugs || md.offerSlugs || "").split(",").map(s=>s.trim()).filter(Boolean);

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      const expiresAt = new Date(Date.now() + days*24*60*60*1000).toISOString();

      // Upsert partner by (email, plan)
      let partnerId: string | null = null;
      {
        const { data, error } = await supabase
          .from("partners")
          .upsert({ name, email, plan, expires_at: expiresAt }, { onConflict: "email,plan" })
          .select("id").limit(1).maybeSingle();
        if (error) throw error;
        partnerId = data?.id as string;
      }
      if (partnerId && offerSlugs.length) {
        const rows = offerSlugs.map(slug => ({ partner_id: partnerId, offer_slug: slug, pinned: true }));
        await supabase.from("partner_offers").upsert(rows, { onConflict: "partner_id,offer_slug" });
      }
    }

    return { statusCode: 200, body: "ok" };
  } catch (e: any) {
    return { statusCode: 400, body: String(e?.message || e) };
  }
};

export default handler;
