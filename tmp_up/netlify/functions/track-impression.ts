// netlify/functions/track-impression.ts
// Records an impression for a given offer slug using Supabase service role

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

function json(body: any, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function parseDevice(userAgent: string | null | undefined): "mobile" | "tablet" | "desktop" | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|kindle|silk/.test(ua)) return "tablet";
  if (/mobi|iphone|android|phone|opera mini/.test(ua)) return "mobile";
  return "desktop";
}

function parseLang(header: string | null | undefined): string | null {
  if (!header) return null;
  const first = String(header).split(",")[0]?.trim();
  if (!first) return null;
  const code = first.split("-")[0].toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return null;
  return code;
}

export const handler: Handler = async (event) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Server not configured" }, 500);
    if (event.httpMethod !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = JSON.parse(event.body || "{}") as { slug?: string };
    const slug = String(body?.slug || "").trim();
    if (!slug) return json({ error: "slug required" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ipRaw = (event.headers["x-forwarded-for"] || event.headers["client-ip"] || event.headers["cf-connecting-ip"] || "") as string;
    const ip = ipRaw.split(",")[0]?.trim();
    const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;
    const userAgent = (event.headers["user-agent"] || null) as string | null;
    // basic bot filter
    if (userAgent && /bot|spider|crawl/i.test(userAgent)) return json({ ok: true, skipped: 'bot' });
    const referrer = (event.headers["referer"] || event.headers["referrer"] || null) as string | null;

    // Resolve offer_id by slug (v2 schema)
    const { data: offer } = await supabase
      .from('offers')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle();
    const offerId = (offer as any)?.id as number | undefined;
    if (!offerId) return json({ ok: true, skipped: 'unknown-slug' });

    try {
      // Dedup within 1h per (ip_hash + UA + offer_id)
      const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
      if (ipHash && userAgent) {
        const { data: existing } = await supabase
          .from('impressions')
          .select('id')
          .eq('offer_id', offerId)
          .eq('ip_hash', ipHash)
          .eq('user_agent', userAgent)
          .gte('ts', oneHourAgo)
          .limit(1);
        if ((existing || []).length) return json({ ok: true, deduped: true });
      }

      await supabase.from("impressions").insert({
        offer_id: offerId,
        ip_hash: ipHash,
        user_agent: userAgent,
        referrer,
      } as any);
    } catch {
      // ignore logging errors to avoid impacting UX
    }

    return json({ ok: true });
  } catch {
    return json({ error: "internal" }, 500);
  }
};

export default handler;
