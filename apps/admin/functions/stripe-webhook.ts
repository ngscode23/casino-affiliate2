// netlify/functions/stripe-webhook.ts
import type { Handler } from "@netlify/functions";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";
import { Stripe } from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string | undefined;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string | undefined;

// Безопасно достаём конец периода в мс, даже если типы уехали куда-то в Альпы
function periodEndMs(obj: unknown): number {
  const sec = Number((obj as { current_period_end?: number })?.current_period_end ?? 0);
  return (sec > 0 ? sec : Math.floor(Date.now() / 1000)) * 1000;
}

export const handler: Handler = async (event) => {
  // Enforce POST: браузер по GET получит 405, а не 400
  if (event.httpMethod && event.httpMethod.toUpperCase() !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: "Method Not Allowed" };
  }

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return { statusCode: 500, body: "Stripe not configured" };
  }
  // Нормальный клиент stripe v18, без any-колдунства
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as Stripe.LatestApiVersion });
  const supabase = getServiceClient();

  try {
    const sig =
      (event.headers["stripe-signature"] as string) ??
      (event.headers["Stripe-Signature"] as string) ??
      (event.headers["STRIPE-SIGNATURE"] as string);

    // Вебхуки Stripe требуют сырой body; учитываем base64
    const body =
      event.isBase64Encoded && event.body
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body || "";

    const evt = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET) as Stripe.Event;

    // helper: скрываем email
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

      if (obj) {
        delete obj["client_secret"];
        if (obj["receipt_email"]) obj["receipt_email"] = maskEmail(obj["receipt_email"]);
        if (obj["customer_email"]) obj["customer_email"] = maskEmail(obj["customer_email"]);
      }
      if (out.data.object.metadata) {
        for (const [k, v] of Object.entries(out.data.object.metadata)) {
          if (typeof v === "string" && /@/.test(v)) (out.data.object.metadata as any)[k] = maskEmail(v);
        }
      }
      return out;
    };

    // идемпотентность: если событие уже логировали, выходим
    try {
      const { data: already } = await supabase
        .from("webhook_logs")
        .select("id")
        .eq("type", evt.type)
        .contains("payload", { id: evt.id })
        .limit(1);
      if ((already || []).length) {
        return { statusCode: 200, body: "duplicate" };
      }
    } catch {
      /* не мешаем основному потоку */
    }

    // Логируем событие (минимум PII)
    try {
      const payload = safePayload(evt);
      await supabase.from("webhook_logs").insert({ type: evt.type, payload });
    } catch {
      /* ignore logging errors */
    }

    // мапа price->plan из env
    const PRICE_TO_PLAN: Record<string, { plan: string; interval: "MONTHLY" | "YEARLY" }> = {};
    const addMap = (id: string | undefined, plan: string, interval: "MONTHLY" | "YEARLY") => {
      if (id && id.trim()) PRICE_TO_PLAN[id.trim()] = { plan, interval };
    };
    addMap(process.env.STRIPE_PRICE_BASIC_MONTHLY, "BASIC", "MONTHLY");
    addMap(process.env.STRIPE_PRICE_FEATURED_MONTHLY, "FEATURED", "MONTHLY");
    addMap(process.env.STRIPE_PRICE_TOP_MONTHLY, "TOP", "MONTHLY");
    addMap(process.env.STRIPE_PRICE_BASIC_YEARLY, "BASIC", "YEARLY");
    addMap(process.env.STRIPE_PRICE_FEATURED_YEARLY, "FEATURED", "YEARLY");
    addMap(process.env.STRIPE_PRICE_TOP_YEARLY, "TOP", "YEARLY");

    async function upsertPartnerFrom(
      email: string,
      plan: string,
      expiresAtIso: string,
      nameHint?: string,
      offerSlugsStr?: string
    ) {
      const name = nameHint || (email ? email.split("@")[0] : "Unknown");
      const { data, error } = await supabase
        .from("partners")
        .upsert({ name, email, plan, expires_at: expiresAtIso }, { onConflict: "email,plan" })
        .select("id")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const partnerId = data?.id as string | undefined;

      const offerSlugs = String(offerSlugsStr || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (partnerId && offerSlugs.length) {
        const rows = offerSlugs.map((slug) => ({ partner_id: partnerId, offer_slug: slug, pinned: true }));
        await supabase.from("partner_offers").upsert(rows, { onConflict: "partner_id,offer_slug" });
      }
    }

    // ── checkout.session.completed ───────────────────────────────────────────────
    if (evt.type === "checkout.session.completed") {
      const session = evt.data.object as Stripe.Checkout.Session;
      const md = (session.metadata || {}) as Record<string, string>;
      const email = String(md.partner_email || md.email || session.customer_details?.email || "");
      const planMd = String(md.plan || "").toUpperCase();
      const offerSlugs = String(md.offer_slugs || md.offerSlugs || "");

      if (session.mode === "subscription" && session.subscription) {
        // нужна подписка, получаем дату окончания и price
        const sub = (await stripe.subscriptions.retrieve(
          String(session.subscription)
        )) as unknown as Stripe.Subscription;

        const priceId = sub.items.data?.[0]?.price?.id || "";
        const mapped = PRICE_TO_PLAN[priceId];
        const plan = (planMd || mapped?.plan || "BASIC") as string;
        const expiresAt = new Date(periodEndMs(sub)).toISOString();

        await upsertPartnerFrom(email, plan, expiresAt, md.partner_name || md.name, offerSlugs);
      } else {
        // разовый платеж по старой схеме (duration_days)
        const name = String(md.partner_name || md.name || "Unknown");
        const plan = planMd || "BASIC";
        const days = Number(md.duration_days || md.days || 30);
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        await upsertPartnerFrom(email, plan, expiresAt, name, offerSlugs);
      }
    }

    // ── customer.subscription.created / updated ─────────────────────────────────
    if (evt.type === "customer.subscription.created" || evt.type === "customer.subscription.updated") {
      const sub = evt.data.object as Stripe.Subscription;
      const status = String(sub.status || "").toLowerCase();

      // план из price либо из metadata
      const priceId = sub.items.data?.[0]?.price?.id || "";
      const mapped = PRICE_TO_PLAN[priceId];
      const plan = (String(sub.metadata?.plan || "").toUpperCase() || mapped?.plan || "BASIC") as string;

      // достаём email клиента
      let email = "";
      try {
        const cust = await stripe.customers.retrieve(String(sub.customer));
        if (!("deleted" in cust)) email = (cust as any)?.email || "";
      } catch {
        /* ignore */
      }
      if (!email) {
        try {
          const inv =
            sub.latest_invoice && typeof sub.latest_invoice === "string"
              ? await stripe.invoices.retrieve(sub.latest_invoice)
              : null;
          email = ((inv as any)?.customer_email || "") as string;
        } catch {
          /* ignore */
        }
      }

      const expiresAt =
        status === "active" || status === "trialing"
          ? new Date(periodEndMs(sub)).toISOString()
          : new Date().toISOString();

      if (email) await upsertPartnerFrom(email, plan, expiresAt);
    }

    // ── customer.subscription.deleted ───────────────────────────────────────────
    if (evt.type === "customer.subscription.deleted") {
      const sub = evt.data.object as Stripe.Subscription;
      let email = "";
      try {
        const cust = await stripe.customers.retrieve(String(sub.customer));
        if (!("deleted" in cust)) email = (cust as any)?.email || "";
      } catch {
        /* ignore */
      }
      const priceId = sub.items.data?.[0]?.price?.id || "";
      const mapped = PRICE_TO_PLAN[priceId];
      const plan = (String(sub.metadata?.plan || "").toUpperCase() || mapped?.plan || "BASIC") as string;

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


