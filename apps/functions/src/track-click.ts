// netlify/functions/track-click.ts
// Records a click for a given offer slug using Supabase service role

import type { Handler } from "@netlify/functions";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";
import crypto from "node:crypto";

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

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json({ error: "method_not_allowed" }, 405);

    const body = JSON.parse(event.body || "{}") as { slug?: string; params?: Record<string, any> };
    const slug = String(body?.slug || "").trim();
    if (!slug) return json({ error: "slug_required" }, 400);

    const supabase = getServiceClient();

    const { data: offer } = await supabase
      .from('offers')
      .select('id, enabled')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle();
    const offerId = (offer as any)?.id as number | undefined;
    const enabled = !!(offer as any)?.enabled;
    if (!offerId || !enabled) return json({ error: "not_found" }, 404);

    const ipRaw = (event.headers["x-forwarded-for"] || event.headers["client-ip"] || event.headers["cf-connecting-ip"] || "") as string;
    const ip = ipRaw.split(",")[0]?.trim();
    const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;
    const userAgent = (event.headers["user-agent"] || null) as string | null;
    const referrer = (event.headers["referer"] || event.headers["referrer"] || null) as string | null;

    try {
      await supabase.from('clicks').insert({
        offer_id: offerId,
        click_id: null,
        params: body?.params || {},
        referrer,
        user_agent: userAgent,
        ip_hash: ipHash,
      } as any);
    } catch {}

    return json({ ok: true });
  } catch {
    return json({ error: "internal" }, 500);
  }
};

export default handler;


