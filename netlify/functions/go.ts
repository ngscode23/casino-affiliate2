// netlify/functions/go.ts
// Server-side affiliate redirect with logging to Supabase
// Requires env vars on Netlify:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// Optional:
// - SITE_ORIGIN (for absolute URL resolution if needed)

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as
  | string
  | undefined;
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
  // Path looks like: "/.netlify/functions/go/<slug>[...optional]"
  const marker = "/.netlify/functions/go/";
  const idx = path.indexOf(marker);
  if (idx === -1) return null;
  const rest = path.slice(idx + marker.length);
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Server not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("offers")
      .select("link, enabled")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (error) {
      // On error, do a soft fallback to SPA route
      return redirect(`/offers/${encodeURIComponent(slug)}`);
    }

    const target = data?.link || null;
    const enabled = !!data?.enabled;
    if (!target || !enabled) {
      return redirect(`/offers/${encodeURIComponent(slug)}`);
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
    const targetHost = (() => {
      try {
        return new URL(target).host;
      } catch {
        return null;
      }
    })();

    // Skip logging for obvious bots/previews
    if (isBotUA(userAgent)) {
      return redirect(targetWithParams, 302);
    }

    // Best-effort logging with soft rate-limit
    try {
      let limited = false;
      // Soft rate limit by (ip_hash, slug) in a short window (env-driven)
      if (ipHash) {
        try {
          const since = new Date(Date.now() - RL_WINDOW_MS).toISOString();
          const { data: recent } = await (supabase as any)
            .from('clicks')
            .select('id')
            .eq('ip_hash', ipHash)
            .eq('slug', slug)
            .gte('ts', since)
            .limit(1);
          if ((recent || []).length) limited = true;
        } catch { /* ignore */ }
      }

      if (!limited) {
        await supabase.from("clicks").insert({
        slug,
        click_id: clickId,
        target_url: target,
        target_url_final: targetWithParams,
        target_host: targetHost,
        params,
        referrer,
        user_agent: userAgent,
        ip_hash: ipHash,
        ts: new Date().toISOString(),
      } as any);
      }
    } catch {
      // ignore
    }

    return redirect(targetWithParams, 302);
  } catch (e) {
    return json({ error: "Unexpected error" }, 500);
  }
};

export default handler;
