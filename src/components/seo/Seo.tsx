import { useEffect, useMemo } from "react";

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

    const origin = typeof location !== "undefined" ? location.origin : "";
    const fallbackOg = ogImage ?? (origin ? `${origin}/og.png` : undefined);
    const urlForOg = ogUrl ?? (typeof location !== "undefined" ? location.href : undefined);

    // Open Graph
    upsertMeta("property", "og:title", title ?? null);
    upsertMeta("property", "og:description", description ?? null);
    upsertMeta("property", "og:url", urlForOg ?? null);
    upsertMeta("property", "og:image", fallbackOg ?? null);

    // Twitter
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title ?? null);
    upsertMeta("name", "twitter:description", description ?? null);
    upsertMeta("name", "twitter:image", fallbackOg ?? null);

    // Canonical
    upsertCanonical(canonical ?? null);
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