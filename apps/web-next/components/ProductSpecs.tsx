"use client";;
import { mutedTextSm } from "@/styles/classnames";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ProductSpecsCard, ProductSpecsData } from "@/app/products/[slug]/data";
import { cn } from "@shared/lib/cn";

type ProductSpecsProps = {
  specs: ProductSpecsData;
  description?: string | null;
};

function SpecsCard({ card }: { card: ProductSpecsCard }) {
  return (
    <article className="rounded-2xl border border-border/30 bg-card/80 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">{card.title}</h3>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-fg/85">
        {card.items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export default function ProductSpecs({ specs, description }: ProductSpecsProps) {
  const [open, setOpen] = useState(false);
  const hasHighlights = specs.highlights.length > 0;
  const hasAttributes = specs.attributes.length > 0;
  const condensedAttributes = useMemo(() => specs.attributes.slice(0, 8), [specs.attributes]);
  const remainingAttributes = useMemo(() => specs.attributes.slice(8), [specs.attributes]);

  return (
    <section className="space-y-6 rounded-3xl border border-border/40 bg-card/60 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-fg">О товаре</h2>
        {description ? <p className={mutedTextSm}>{description}</p> : null}
      </header>
      {hasHighlights ? (
        <div className="space-y-3 rounded-2xl border border-border/30 bg-card/75 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Кратко</h3>
          <ul className="grid gap-2 text-sm text-fg/90 sm:grid-cols-2">
            {specs.highlights.slice(0, 6).map((highlight, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {hasAttributes ? (
        <div className="rounded-2xl border border-border/30 bg-card/75">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
          >
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Характеристики</h3>
              <p className={mutedTextSm}>Технические детали и основные параметры</p>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                open ? "-rotate-180" : "rotate-0",
              )}
              aria-hidden
            />
          </button>

          <div className="border-t border-border/20 p-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              {(open ? specs.attributes : condensedAttributes).map((row, idx) => (
                <div
                  key={`${row.key}-${idx}`}
                  className="rounded-xl border border-border/20 bg-card/80 px-3 py-2 text-sm leading-tight text-fg/85"
                >
                  <dt className="text-xs uppercase tracking-[0.18em] text-muted">{row.key}</dt>
                  <dd className="mt-1 font-medium text-fg">{row.value}</dd>
                </div>
              ))}
            </dl>
            {!open && remainingAttributes.length ? (
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
                onClick={() => setOpen(true)}
              >
                Показать ещё {remainingAttributes.length}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {specs.cards.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {specs.cards.map((card, idx) => (
            <SpecsCard key={`${card.title}-${idx}`} card={card} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
