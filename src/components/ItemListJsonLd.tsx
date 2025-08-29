// src/components/ItemListJsonLd.tsx
import { useEffect, useMemo } from "react";

type Item = { url: string; name: string };

export default function ItemListJsonLd({ items }: { items: Item[] }) {
  const json = useMemo(() => {
    const payload = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: it.url,
        name: it.name,
      })),
    };
    return JSON.stringify(payload);
  }, [items]);

  useEffect(() => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.text = json;
    document.head.appendChild(el);
    return () => {
      document.head.removeChild(el);
    };
  }, [json]);

  return null;
}



