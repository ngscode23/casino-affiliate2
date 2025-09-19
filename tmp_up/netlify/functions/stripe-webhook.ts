// netlify/functions/stripe-webhook.ts
import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string | undefined;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string | undefined;
const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const handler: Handler = async (event) => {
  // Enforce POST for webhooks; browsers hitting GET will receive 405 instead of 400
  if (event.httpMethod && event.httpMethod.toUpperCase() !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
  }
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return { statusCode: 500, body: "Stripe not configured" };
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: "Supabase not configured" };
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    const sig = event.headers["stripe-signature"] as string;
    // Ensure we pass the exact raw request body to Stripe (handle base64-encoded bodies)
    const body = event.isBase64Encoded && event.body
      ? Buffer.from(event.body, "base64").toString("utf8")
      : (event.body || "");
    const evt = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);

    // Helper to mask emails like user***@dom***
    const maskEmail = (e?: string | null) => {
      if (!e) return e;
      const [u, d] = String(e).split("@");
      if (!d) return "***";
      const mu = u.length > 3 ? u.slice(0, 3) + "***" : "***";
      const md = d.length > 3 ? d.slice(0, 3) + "***" : "***";
      return `${mu}@${md}`;
    };
    const safePayload = (e: Stripe.Event) => {
      const base: any = {
        id: e.id,
        type: e.type,
        created: e.created,
        livemode: (e as any).livemode ?? false,
      };
      const obj: any = (e.data && (e.data as any).object) || null;
      const meta: any = obj?.metadata || undefined;
      const customer = obj?.customer || undefined;
      const objectId = obj?.id || undefined;
      const out: any = { ...base, data: { object: { id: objectId, customer, metadata: meta } } };
      // Remove/Mask potentially sensitive fields if present
      if (obj) {
        delete obj["client_secret"];
        if (obj["receipt_email"]) obj["receipt_email"] = maskEmail(obj["receipt_email"]);
        if (obj["customer_email"]) obj["customer_email"] = maskEmail(obj["customer_email"]);
      }
      // Mask possible emails in metadata
      if (out.data.object.metadata) {
        for (const [k, v] of Object.entries(out.data.object.metadata)) {
          if (typeof v === 'string' && /@/.test(v)) (out.data.object.metadata as any)[k] = maskEmail(v);
        }
      }
      return out;
    };
    // Idempotency: skip if event already processed (payload->>'id' match)
    try {
      const { data: already } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('type', evt.type)
        .contains('payload', { id: evt.id })
        .limit(1)
      if ((already || []).length) {
        return { statusCode: 200, body: "duplicate" }
      }
    } catch { /* ignore and continue */ }

    // Log any valid event in webhook_logs (masked, minimal PII)
    try {
      const payload = safePayload(evt)
      await supabase.from('webhook_logs').insert({ type: evt.type, payload })
    } catch { /* ignore logging errors */ }

    // Build reverse price -> plan map from env (if configured)
    const PRICE_TO_PLAN: Record<string, { plan: string; interval: 'MONTHLY'|'YEARLY' }> = {};
    const addMap = (id: string | undefined, plan: string, interval: 'MONTHLY'|'YEARLY') => {
      if (id && id.trim()) PRICE_TO_PLAN[id.trim()] = { plan, interval };
    };
    addMap(process.env.STRIPE_PRICE_BASIC_MONTHLY, 'BASIC', 'MONTHLY');
    addMap(process.env.STRIPE_PRICE_FEATURED_MONTHLY, 'FEATURED', 'MONTHLY');
    addMap(process.env.STRIPE_PRICE_TOP_MONTHLY, 'TOP', 'MONTHLY');
    addMap(process.env.STRIPE_PRICE_BASIC_YEARLY, 'BASIC', 'YEARLY');
    addMap(process.env.STRIPE_PRICE_FEATURED_YEARLY, 'FEATURED', 'YEARLY');
    addMap(process.env.STRIPE_PRICE_TOP_YEARLY, 'TOP', 'YEARLY');

    async function upsertPartnerFrom(email: string, plan: string, expiresAtIso: string, nameHint?: string, offerSlugsStr?: string) {
      const name = nameHint || (email ? email.split('@')[0] : 'Unknown');
      // Upsert partner by (email, plan)
      let partnerId: string | null = null;
      const { data, error } = await supabase
        .from("partners")
        .upsert({ name, email, plan, expires_at: expiresAtIso }, { onConflict: "email,plan" })
        .select("id").limit(1).maybeSingle();
      if (error) throw error;
      partnerId = data?.id as string;
      const offerSlugs = String(offerSlugsStr || "").split(",").map(s=>s.trim()).filter(Boolean);
      if (partnerId && offerSlugs.length) {
        const rows = offerSlugs.map(slug => ({ partner_id: partnerId, offer_slug: slug, pinned: true }));
        await supabase.from("partner_offers").upsert(rows, { onConflict: "partner_id,offer_slug" });
      }
    }

    if (evt.type === "checkout.session.completed") {
      const session = evt.data.object as Stripe.Checkout.Session;
      const md = (session.metadata || {}) as any;
      const email = String(md.partner_email || md.email || session.customer_details?.email || "");
      const planMd = String(md.plan || "").toUpperCase();
      const offerSlugs = String(md.offer_slugs || md.offerSlugs || "");

      if (session.mode === 'subscription' && session.subscription) {
        // Fetch subscription to get current_period_end and price
        const stripe = new Stripe(STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" } as any);
        const sub = await stripe.subscriptions.retrieve(String(session.subscription));
        const priceId = sub.items.data?.[0]?.price?.id || '';
        const mapped = PRICE_TO_PLAN[priceId];
        const plan = (planMd || mapped?.plan || 'BASIC') as string;
        const end = (sub.current_period_end || Math.floor(Date.now()/1000)) * 1000;
        const expiresAt = new Date(end).toISOString();
        await upsertPartnerFrom(email, plan, expiresAt, md.partner_name || md.name, offerSlugs);
      } else {
        // Legacy one-off checkout fallback using duration days
        const name = String(md.partner_name || md.name || "Unknown");
        const plan = planMd || 'BASIC';
        const days = Number(md.duration_days || md.days || 30);
        const expiresAt = new Date(Date.now() + days*24*60*60*1000).toISOString();
        await upsertPartnerFrom(email, plan, expiresAt, name, offerSlugs);
      }
    }

    if (evt.type === 'customer.subscription.created' || evt.type === 'customer.subscription.updated') {
      const sub = evt.data.object as Stripe.Subscription;
      const status = String(sub.status || '').toLowerCase();
      // Resolve plan from price or metadata
      const priceId = sub.items.data?.[0]?.price?.id || '';
      const mapped = PRICE_TO_PLAN[priceId];
      const plan = (String(sub.metadata?.plan || '').toUpperCase() || mapped?.plan || 'BASIC') as string;
      // Get customer email
      const stripe = new Stripe(STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" } as any);
      let email = '';
      try {
        const cust = await stripe.customers.retrieve(String(sub.customer));
        if (!('deleted' in cust)) email = (cust as any)?.email || '';
      } catch { /* ignore */ }
      if (!email) {
        // Try to read from latest invoice
        try {
          const inv = sub.latest_invoice && typeof sub.latest_invoice === 'string' ? await stripe.invoices.retrieve(sub.latest_invoice) : null;
          // @ts-ignore
          email = (inv?.customer_email || '') as string;
        } catch { /* ignore */ }
      }
      const end = (sub.current_period_end || Math.floor(Date.now()/1000)) * 1000;
      const expiresAt = (status === 'active' || status === 'trialing') ? new Date(end).toISOString() : new Date().toISOString();
      if (email) await upsertPartnerFrom(email, plan, expiresAt);
    }

    if (evt.type === 'customer.subscription.deleted') {
      const sub = evt.data.object as Stripe.Subscription;
      const stripe = new Stripe(STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" } as any);
      let email = '';
      try {
        const cust = await stripe.customers.retrieve(String(sub.customer));
        if (!('deleted' in cust)) email = (cust as any)?.email || '';
      } catch { /* ignore */ }
      const priceId = sub.items.data?.[0]?.price?.id || '';
      const mapped = PRICE_TO_PLAN[priceId];
      const plan = (String(sub.metadata?.plan || '').toUpperCase() || mapped?.plan || 'BASIC') as string;
      if (email) {
        const nowIso = new Date().toISOString();
        await upsertPartnerFrom(email, plan, nowIso);
      }
    }

    return { statusCode: 200, body: "ok" };
  } catch (e: any) {
    return { statusCode: 400, body: String(e?.message || e) };
  }
};

export default handler;
