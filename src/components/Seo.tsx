import { useEffect, useMemo } from "react";
import { SITE_URL, SITE_NAME } from "@/config";

type JsonLd = Record<string, unknown>;

type Props = {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogUrl?: string;
  jsonLd?: JsonLd | JsonLd[];
  noIndex?: boolean; // legacy
  noindex?: boolean; // alias
};

function upsertMeta(attr: "name" | "property", key: string, content?: string | null) {
  if (typeof document === "undefined") return;
  const head = document.head;
  const sel = `meta[${attr}="${key}"]`;
  const prev = head.querySelector<HTMLMetaElement>(sel);

  if (!content) {
    if (prev) head.removeChild(prev);
    return;
  }
  const el =
    prev ??
    (() => {
      const m = document.createElement("meta");
      m.setAttribute(attr, key);
      head.appendChild(m);
      return m;
    })();

  el.setAttribute("content", content);
}

function upsertCanonical(href?: string | null) {
  if (typeof document === "undefined") return;
  const head = document.head;
  let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!href) {
    if (link) head.removeChild(link);
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    head.appendChild(link);
  }
  link.href = href;
}

function replaceHreflang(alts: Array<{ lang: string; href: string }>) {
  if (typeof document === "undefined") return;
  const prev = document.querySelectorAll('link[data-seo-hreflang="true"]');
  prev.forEach((n) => n.parentElement?.removeChild(n));
  const head = document.head;
  for (const { lang, href } of alts) {
    const l = document.createElement("link");
    l.rel = "alternate";
    l.setAttribute("hreflang", lang);
    l.href = href;
    l.setAttribute("data-seo-hreflang", "true");
    head.appendChild(l);
  }
}

export default function Seo(props: Props) {
  const {
    title,
    description,
    canonical,
    ogImage,
    ogUrl,
    jsonLd,
    noIndex,
    noindex,
  } = props;

  const robots = noIndex || noindex ? "noindex,nofollow" : "index,follow";

  const jsonArray = useMemo<JsonLd[] | null>(() => {
    if (!jsonLd) return null;
    return Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  }, [jsonLd]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (title) document.title = title;

    upsertMeta("name", "description", description ?? null);
    upsertMeta("name", "robots", robots);

    const origin = (SITE_URL || "").replace(/\/$/, "");
    const pathname = typeof location !== "undefined" ? location.pathname : "";
    const search = typeof location !== "undefined" ? location.search : "";
    const canonicalHref = canonical ?? (origin && pathname ? `${origin}${pathname}` : undefined);
    // Prefer existing SVG fallback if page doesn't provide a custom image
    const fallbackOg = ogImage ?? (origin ? `${origin}/og.svg` : undefined);
    const urlForOg = ogUrl ?? (canonicalHref ?? (origin && pathname ? `${origin}${pathname}${search}` : undefined));

    // Open Graph
    upsertMeta("property", "og:site_name", SITE_NAME || null);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:title", title ?? null);
    upsertMeta("property", "og:description", description ?? null);
    upsertMeta("property", "og:url", urlForOg ?? null);
    upsertMeta("property", "og:image", fallbackOg ?? null);
    // og:locale + alternates
    try {
      const lang = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
      const map: Record<string, string> = { en: "en_US", ru: "ru_RU" };
      const current = map[lang] || "en_US";
      const alternates = Object.values(map).filter((v) => v !== current);
      upsertMeta("property", "og:locale", current);
      // Use a simple approach: write one alternate meta per call
      alternates.forEach((loc) => upsertMeta("property", "og:locale:alternate", loc));
    } catch {}

    // Twitter
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title ?? null);
    upsertMeta("name", "twitter:description", description ?? null);
    upsertMeta("name", "twitter:image", fallbackOg ?? null);

    // Canonical
    upsertCanonical(canonicalHref ?? null);

    // Hreflang alternates: use ?lang=en / ?lang=ru and x-default canonical
    if (canonicalHref) {
      const join = canonicalHref.includes("?") ? "&" : "?";
      const altEn = `${canonicalHref}${join}lang=en`;
      const altRu = `${canonicalHref}${join}lang=ru`;
      replaceHreflang([
        { lang: "en", href: altEn },
        { lang: "ru", href: altRu },
        { lang: "x-default", href: canonicalHref },
      ]);
    }
  }, [title, description, robots, ogImage, ogUrl, canonical]);

  // JSON-LD
  useEffect(() => {
    if (typeof document === "undefined") return;

    const prev = document.querySelectorAll('script[data-seo-jsonld="true"]');
    prev.forEach((n) => n.parentElement?.removeChild(n));

    if (!jsonArray) return;

    jsonArray.forEach((obj, idx) => {
      const el = document.createElement("script");
      el.type = "application/ld+json";
      el.setAttribute("data-seo-jsonld", "true");
      el.setAttribute("data-idx", String(idx));
      el.text = JSON.stringify(obj);
      document.head.appendChild(el);
    });

    return () => {
      const nodes = document.querySelectorAll('script[data-seo-jsonld="true"]');
      nodes.forEach((n) => n.parentElement?.removeChild(n));
    };
  }, [jsonArray]);

  return null;
}
