import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { getAdminClient } from "@/utils/supabase/admin";

const RL_WINDOW_MS = (() => {
  const raw = Number(process.env.GO_CLICK_RATELIMIT_MS ?? 5000);
  if (!Number.isFinite(raw)) return 5000;
  return Math.min(Math.max(raw, 5000), 15000);
})();

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function redirect(location: string, status = 302) {
  const response = NextResponse.redirect(location, status);
  response.headers.set("cache-control", "no-store");
  return response;
}

function genClickId(): string {
  try {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // ignore
  }
  const suffix = Math.random().toString(36).slice(2, 10);
  return `c_${Date.now().toString(36)}_${suffix}`;
}

function isBotUA(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const value = ua.toLowerCase();
  return /(bot|spider|crawl|slurp|facebookexternalhit|whatsapp|telegram|preview|insights|pingdom|crawler)/i.test(
    value,
  );
}

function withTrackingParams(
  target: string,
  query: URLSearchParams,
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
  for (const [key, value] of query.entries()) {
    if (allowed.has(key) && value) {
      outParams[key] = value;
    }
  }

  const clickId = outParams.click_id || genClickId();
  outParams.click_id = clickId;
  if (!outParams.subid) outParams.subid = clickId;

  try {
    const url = new URL(target);
    const search = new URLSearchParams(url.search);
    for (const [key, value] of Object.entries(outParams)) {
      if (!search.has(key)) search.set(key, value);
    }
    url.search = search.toString();
    return { url: url.toString(), params: outParams };
  } catch {
    const separator = target.includes("?") ? "&" : "?";
    const qs = new URLSearchParams(outParams).toString();
    return { url: `${target}${separator}${qs}`, params: outParams };
  }
}

function hashIp(request: Request): string | null {
  const header = request.headers.get("x-forwarded-for") ?? "";
  const ip = header.split(",")[0].trim();
  if (!ip) return null;
  try {
    return crypto.createHash("sha256").update(ip).digest("hex");
  } catch {
    return null;
  }
}

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { slug: slugRaw } = await params;
  const slug = (slugRaw ?? "").trim();
  if (!slug) {
    return json({ error: "no_slug" }, 400);
  }

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("offers")
      .select("id, link, enabled")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (error) {
      return json({ error: "not_found" }, 404);
    }

    const target = data?.link ?? null;
    const offerId = (data as { id?: number })?.id;
    const enabled = Boolean(data?.enabled);

    if (!target || !enabled) {
      return json({ error: "not_found" }, 404);
    }

    const url = new URL(request.url);
    const { url: targetWithParams, params } = withTrackingParams(target, url.searchParams);

    const referrer =
      request.headers.get("referer") ?? request.headers.get("referrer") ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;
    const ipHash = hashIp(request);
    const clickId = params.click_id ?? null;

    if (!isBotUA(userAgent)) {
      try {
        let limited = false;
        if (ipHash && offerId != null) {
          const since = new Date(Date.now() - RL_WINDOW_MS).toISOString();
          const { data: recent } = await supabase
            .from("clicks")
            .select("id")
            .eq("ip_hash", ipHash)
            .eq("offer_id", offerId)
            .gte("ts", since)
            .limit(1);
          if (Array.isArray(recent) && recent.length) {
            limited = true;
          }
        }

        if (!limited) {
          const payload: Record<string, unknown> = {
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
        // ignore logging errors
      }
    }

    return redirect(targetWithParams, 302);
  } catch {
    return json({ error: "internal" }, 500);
  }
}
