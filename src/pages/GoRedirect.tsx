import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import { supabase } from "@/lib/supabase";
import { getOfferBySlug } from "@/features/offers/api/getOffers";
import { track } from "@/lib/analytics";

function genClickId(): string {
  try {
    const r = Math.random().toString(36).slice(2, 10);
    return `c_${Date.now().toString(36)}_${r}`;
  } catch {
    return String(Date.now());
  }
}

function withTrackingParams(target: string): { url: string; params: Record<string, string> } {
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
  try {
    const current = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
    current.forEach((v, k) => {
      if (allowed.has(k)) outParams[k] = v;
    });

    // always attach our click id for attribution
    const clickId = genClickId();
    if (!outParams["click_id"]) outParams["click_id"] = clickId;
    if (!outParams["subid"]) outParams["subid"] = clickId;

    // merge into target URL (do not override existing params on target)
    try {
      const u = new URL(target, typeof location !== "undefined" ? location.origin : undefined);
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
  } catch {
    return { url: target, params: {} };
  }
}

export default function GoRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const redirectedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      try {
        if (!slug) throw new Error("No slug");

        // 1) Resolve offer link by slug (from API)
        const offer = await getOfferBySlug(slug);
        const target = offer?.link;
        if (!target) throw new Error("Offer link not found");

        // 2) Build target with tracking params
        const { url: targetWithParams, params } = withTrackingParams(target);
        const clickId = (params && (params as any)["click_id"]) || null;

        // 3) Fire analytics event (best-effort)
        try {
          track("go_redirect_click", {
            offer_slug: slug,
            target_host: (() => { try { return new URL(target).host; } catch { return null; } })(),
            has_params: Object.keys(params).length > 0,
            click_id: clickId,
            ...params,
          });
        } catch { /* noop */ }

        // 4) Log to Supabase (best-effort; ignore failure in prod)
        try {
          await supabase.from("clicks").insert({
            slug,
            click_id: clickId,
            target_url: target,
            target_url_final: targetWithParams,
            target_host: (() => { try { return new URL(target).host; } catch { return null; } })(),
            params,
            referrer: typeof document !== "undefined" ? document.referrer || null : null,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent || null : null,
            ts: new Date().toISOString(),
          } as any);
        } catch {
          // swallow logging errors
        }

        // 5) Redirect
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          window.location.replace(targetWithParams);
        }
      } catch {
        // On error, bounce back to offer or compare
        if (slug) nav(`/offers/${encodeURIComponent(slug)}`, { replace: true });
        else nav("/compare", { replace: true });
      }
    };
    run();
  }, [slug, nav]);

  return (
    <Section className="py-10">
      <Card className="p-6">Redirecting.</Card>
    </Section>
  );
}
