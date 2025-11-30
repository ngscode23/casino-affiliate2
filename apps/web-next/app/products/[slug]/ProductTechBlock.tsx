'use client';

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@shared/lib/cn";
import {
  DEFAULT_PRODUCT_TECH_TITLE,
  type ProductTechSpecs,
  type ProductTechSection,
} from "@/lib/catalog/product-tech-specs";

type ProductTechBlockProps = {
  data: ProductTechSpecs;
  defaultCollapsed?: boolean;
};

function SectionRows({ section }: { section: ProductTechSection }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {section.rows.map((row, idx) => (
        <div
          key={`${section.id}-${idx}`}
          className="rounded-2xl border border-border/20 bg-card/80 px-4 py-3 text-sm leading-tight text-fg/85"
        >
          <div className="text-xs uppercase tracking-[0.2em] text-muted">{row.name}</div>
          <div className="mt-1 font-semibold text-fg">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function ProductTechBlock({ data, defaultCollapsed = true }: ProductTechBlockProps) {
  const sections = useMemo(() => (Array.isArray(data.sections) ? data.sections.filter((section) => section.rows.length) : []), [data.sections]);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [openSectionId, setOpenSectionId] = useState<string | null>(() => sections[0]?.id ?? null);

  useEffect(() => {
    if (!sections.length) {
      setOpenSectionId(null);
      return;
    }
    setOpenSectionId((prev) => {
      if (!prev) return sections[0]?.id ?? null;
      return sections.some((section) => section.id === prev) ? prev : sections[0]?.id ?? null;
    });
  }, [sections]);

  if (!sections.length) return null;

  const title = (typeof data.title === "string" && data.title.trim()) || DEFAULT_PRODUCT_TECH_TITLE;

  return (
    <section className="rounded-3xl border border-border/40 bg-card/60 p-6">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-expanded={!collapsed}
      >
        <div>
          <h2 className="text-2xl font-semibold text-fg">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {sections.length} {sections.length === 1 ? "секция" : sections.length < 5 ? "секции" : "секций"}
          </p>
        </div>
        <ChevronDown
          className={cn("h-6 w-6 text-muted-foreground transition-transform", collapsed ? "rotate-0" : "-rotate-180")}
          aria-hidden
        />
      </button>

      {!collapsed ? (
        <div className="mt-6 space-y-4">
          {sections.map((section, idx) => {
            const open = openSectionId ? openSectionId === section.id : idx === 0;
            return (
              <article key={section.id} className="rounded-2xl border border-border/30 bg-card/70">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  onClick={() => setOpenSectionId((prev) => (prev === section.id ? null : section.id))}
                  aria-expanded={open}
                >
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">{section.title}</h3>
                    <p className="text-xs text-muted-foreground">{section.rows.length} параметров</p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform duration-200",
                      open ? "-rotate-180" : "rotate-0",
                    )}
                    aria-hidden
                  />
                </button>
                <div className={cn("border-t border-border/20 px-5 py-4", open ? "block" : "hidden")}>
                  <SectionRows section={section} />
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
