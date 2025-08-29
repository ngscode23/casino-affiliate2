// src/components/faq/Faq.tsx
import { useEffect, useId, useMemo } from "react";

export type FaqItem = { q: string; a: string };
type Props = {
  items: FaqItem[];
  className?: string;
  title?: string;
  /** When true, injects FAQPage JSON-LD for these items into <head> */
  jsonLd?: boolean;
};

export default function Faq({ items, className, title = "FAQ", jsonLd = false }: Props) {
  const baseId = useId();
  const list = useMemo(
    () => items.filter(i => i.q?.trim() && i.a?.trim()),
    [items]
  );

  // Optional JSON-LD injection
  useEffect(() => {
    if (!jsonLd || !list.length || typeof document === "undefined") return;
    const scriptId = `faq-jsonld-${baseId}`;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-faq-jsonld", scriptId);
    el.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: list.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    });
    document.head.appendChild(el);
    return () => {
      const prev = document.querySelectorAll(`script[data-faq-jsonld="${scriptId}"]`);
      prev.forEach((n) => n.parentElement?.removeChild(n));
    };
  }, [jsonLd, list, baseId]);

  if (!list.length) return null;

  return (
    <section className={className ?? "neon-card p-4"}>
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <ul className="space-y-3">
        {list.map((it, idx) => {
          const qId = `${baseId}-q-${idx}`;
          const aId = `${baseId}-a-${idx}`;
          return (
            <li key={idx} className="border border-white/10 rounded-lg">
              <details>
                <summary
                  id={qId}
                  aria-controls={aId}
                  className="cursor-pointer list-none px-3 py-2 font-medium"
                >
                  {it.q}
                </summary>
                <div
                  id={aId}
                  role="region"
                  aria-labelledby={qId}
                  className="px-3 pb-3 pt-1 opacity-90"
                >
                  {it.a}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
