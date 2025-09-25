// netlify/functions/go.ts
// Server-side affiliate redirect with logging to Supabase
// Requires env vars on Netlify:
// - SUPABASE_URL
// - SUPABASE_SECRET_KEY
// Optional:
// - SITE_ORIGIN (for absolute URL resolution if needed)

import type { Handler } from "@netlify/functions";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";
import crypto from "node:crypto";

const RL_WINDOW_MS = (() => {
  const raw = Number(process.env.GO_CLICK_RATELIMIT_MS || 5000);
  if (!isFinite(raw)) return 5000;
  return Math.min(Math.max(raw, 5000), 15000); // clamp 5s..15s
})();

function json(obj: any, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(obj),
  };
}

function redirect(location: string, statusCode = 302) {
  return {
    statusCode,
    headers: {
      Location: location,
      "cache-control": "no-store",
    },
    body: "",
  };
}

function getSlugFromPath(path: string | undefined): string | null {
  if (!path) return null;
  const markers = ["/.netlify/functions/go/", "/api/go/", "/go/"];
  let rest: string | null = null;
  for (const marker of markers) {
    const idx = path.indexOf(marker);
    if (idx !== -1) {
      rest = path.slice(idx + marker.length);
      break;
    }
  }
  if (!rest) return null;
  const slug = rest.split("/")[0];
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function genClickId(): string {
  try {
    // Prefer crypto.randomUUID when available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyGlobal = globalThis as any;
    if (anyGlobal?.crypto?.randomUUID) return anyGlobal.crypto.randomUUID();
  } catch {}
  const r = Math.random().toString(36).slice(2, 10);
  return `c_${Date.now().toString(36)}_${r}`;
}

function isBotUA(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const s = ua.toLowerCase();
  return /(bot|spider|crawl|slurp|facebookexternalhit|whatsapp|telegram|preview|insights|pingdom|crawler)/i.test(s);
}

function withTrackingParams(
  target: string,
  query: Record<string, string | undefined>
): { url: string; params: Record<string, string> } {
  const allowed = new Set([
    "subid",
    "sub_id",
    "aff_sub",
    "aff_sub2",
    "click_id",
    "cid",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "ref",
  ]);

  const outParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(query || {})) {
    if (v != null && allowed.has(k)) outParams[k] = String(v);
  }

  // Always attach our click id
  const clickId = outParams["click_id"] || genClickId();
  outParams["click_id"] = clickId;
  if (!outParams["subid"]) outParams["subid"] = clickId;

  // Merge into target URL without overriding existing params on target
  try {
    const u = new URL(target);
    const to = new URLSearchParams(u.search);
    for (const [k, v] of Object.entries(outParams)) {
      if (!to.has(k)) to.set(k, v);
    }
    u.search = to.toString();
    return { url: u.toString(), params: outParams };
  } catch {
    const sep = target.includes("?") ? "&" : "?";
    const qs = new URLSearchParams(outParams).toString();
    return { url: target + sep + qs, params: outParams };
  }
}

export const handler: Handler = async (event) => {
  try {
    const slug = getSlugFromPath(event.path);
    if (!slug) return json({ error: "No slug" }, 400);

    // Resolve offer link from Supabase (offers table)
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("offers")
      .select("id, link, enabled")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (error) {
      return json({ error: "not_found" }, 404);
    }

    const target = data?.link || null;
    const offerId = (data as any)?.id as number | undefined;
    const enabled = !!data?.enabled;
    // Allow redirect even if offer id is missing in mock/test environments
    if (!target || !enabled) {
      return json({ error: "not_found" }, 404);
    }

    const { url: targetWithParams, params } = withTrackingParams(
      target,
      event.queryStringParameters || {}
    );

    const clickId = params["click_id"] || null;
    const referrer = event.headers["referer"] || event.headers["referrer"] || null;
    const userAgent = event.headers["user-agent"] || null;
    const ipHash = (() => {
      try {
        const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim();
        if (!ip) return null;
        return crypto.createHash("sha256").update(ip).digest("hex");
      } catch { return null; }
    })();
    // Note: v2 schema no longer stores target host/urls in clicks

    // Skip logging for obvious bots/previews
    if (isBotUA(userAgent)) {
      return redirect(targetWithParams, 302);
    }

    // Best-effort logging with soft rate-limit
    try {
      let limited = false;
      // Soft rate limit by (ip_hash, offer_id) in a short window (env-driven)
      if (ipHash && offerId != null) {
        try {
          const since = new Date(Date.now() - RL_WINDOW_MS).toISOString();
          const { data: recent } = await (supabase as any)
            .from('clicks')
            .select('id')
            .eq('ip_hash', ipHash)
            .eq('offer_id', offerId)
            .gte('ts', since)
            .limit(1);
          if ((recent || []).length) limited = true;
        } catch { /* ignore */ }
      }

      if (!limited) {
        const payload: any = {
          click_id: clickId,
          params,
          referrer,
          user_agent: userAgent,
          ip_hash: ipHash,
        };
        if (offerId != null) payload.offer_id = offerId;
        await supabase.from("clicks").insert(payload);
      }
    } catch {
      // ignore
    }

    return redirect(targetWithParams, 302);
  } catch {
    return json({ error: "internal" }, 500);
  }
};

export default handler;



