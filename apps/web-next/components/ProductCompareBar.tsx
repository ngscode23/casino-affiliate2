"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { SlidersHorizontal, X } from "lucide-react";

import { useCompare } from "@shared/ctx/CompareContext";
import { cn } from "@shared/lib/cn";

type CompareProduct = {
  id: string;
  name: string;
  slug: string | null;
  price: string | null;
  availability: string | null;
  image: string | null;
  variantLabel: string | null;
};

function normalizeSelected(selected: unknown[]): CompareProduct[] {
  return selected
    .map((raw) => {
      const value = raw as Record<string, unknown>;
      const slug = typeof value.slug === "string" ? value.slug : null;
      const id = (slug || (typeof value.id === "string" ? value.id : null) || String(value.name ?? "")) as string;
      if (!id) return null;
      return {
        id,
        name: String(value.name ?? value.title ?? "Product"),
        slug,
        price: typeof value.price === "string" ? value.price : null,
        availability:
          typeof value.availability === "string"
            ? value.availability
            : typeof value.availabilityLabel === "string"
              ? value.availabilityLabel
              : null,
        image: typeof value.image === "string" ? value.image : null,
        variantLabel: typeof value.variantLabel === "string" ? value.variantLabel : null,
      };
    })
    .filter((item): item is CompareProduct => Boolean(item));
}

export default function ProductCompareBar() {
  const { selected, clear, remove, max } = useCompare();

  const items = useMemo(() => normalizeSelected(selected), [selected]);
  const slugs = useMemo(
    () =>
      items
        .map((item) => item.slug)
        .filter((slug): slug is string => Boolean(slug)),
    [items],
  );

  const canCompare = slugs.length >= 2;
  const compareHref = canCompare ? `/compare?set=${encodeURIComponent(slugs.join(","))}` : "#";
  const remainingToStart = Math.max(0, 2 - items.length);

  if (!items.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:px-6">
      <div className="pointer-events-auto mx-auto flex w-full max-w-screen-lg flex-col gap-3 rounded-3xl border border-border/60 bg-card/95 px-4 py-3.5 shadow-[0_18px_48px_rgba(15,23,42,0.28)] backdrop-blur-md">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/85 px-3 py-1">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Сравнение
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-[2px] text-[11px] font-semibold text-primary">
                {items.length}/{max}
              </span>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {items.length < 2
                ? `Добавьте ещё ${remainingToStart} товар(а), чтобы начать сравнение`
                : "Готово: откройте таблицу сравнения"}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-2 sm:mt-0">
            <button
              type="button"
              onClick={clear}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-fg hover:underline"
            >
              Очистить
            </button>
            <Link
              href={compareHref}
              prefetch={false}
              aria-disabled={!canCompare}
              onClick={(event) => {
                if (!canCompare) {
                  event.preventDefault();
                }
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition",
                canCompare
                  ? "bg-primary text-primaryfg shadow-sm hover:-translate-y-[1px] hover:bg-primary/90"
                  : "cursor-not-allowed bg-border/40 text-muted-foreground",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Открыть сравнение</span>
            </Link>
          </div>
        </div>

        <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth">
          {items.map((item) => (
            <div
              key={item.id}
              className="inline-flex items-center gap-3 rounded-2xl border border-border/60 bg-background/90 px-3 py-1.5 text-xs text-fg shadow-[0_10px_30px_rgba(15,23,42,0.24)]"
            >
              {item.image ? (
                <div className="relative h-8 w-8 overflow-hidden rounded-xl bg-muted/40">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="max-w-[150px] truncate font-medium" title={item.name}>
                  {item.name}
                </div>
                {item.variantLabel ? (
                  <div className="max-w-[150px] truncate text-[10px] text-muted-foreground">
                    {item.variantLabel}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => remove(item.slug ?? item.id)}
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:bg-background hover:text-fg"
                aria-label={`Убрать ${item.name} из сравнения`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
