// src/lib/jsonld.ts

export type JsonLd = Record<string, unknown>;

// Хелпер для абсолютных ссылок
function abs(baseUrl: string, u: string) {
  try {
    return new URL(u, baseUrl).toString();
  } catch {
    // если baseUrl кривой — вернём как есть
    return u;
  }
}

/** Жёсткая вставка JSON-LD: удаляет старый <script id> и добавляет новый */
export function injectJsonLd(id: string, data: Record<string, unknown>) {
  if (typeof document === "undefined") return; // SSR-safe

  const old = document.getElementById(id);
  if (old?.parentNode) old.parentNode.removeChild(old);

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = id;
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
}

/** Upsert JSON-LD: создаёт или обновляет <script id>, возвращает cleanup */
export function upsertJsonLd(id: string, data: JsonLd): () => void {
  if (typeof document === "undefined") return () => {};

  const head = document.head || document.getElementsByTagName("head")[0];
  let el = document.getElementById(id) as HTMLScriptElement | null;

  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    head.appendChild(el);
  }

  el.text = JSON.stringify(data);

  return () => {
    const n = document.getElementById(id);
    if (n && n.parentNode) n.parentNode.removeChild(n);
  };
}

/** ItemList — каноничная схема через ListItem.item (Thing) */
export function makeItemListLD(
  baseUrl: string,
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Thing",
        name: it.name,
        url: abs(baseUrl, it.url),
      },
    })),
  };
}

/** BreadcrumbList — оставляем name + item (URL) */
export function makeBreadcrumbsLD(
  baseUrl: string,
  trail: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((it, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: it.name,
      item: abs(baseUrl, it.url),
    })),
  };
}

/** Organization — базовый профиль компании/сайта */
export function makeOrganizationLD(params: {
  name: string;
  url: string;
  logo?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: params.name,
    url: params.url,
    ...(params.logo ? { logo: params.logo } : {}),
  };
}



