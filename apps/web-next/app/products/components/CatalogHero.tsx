"use client";

import RevealOnScroll from "@/components/animation/RevealOnScroll";

type CatalogHeroProps = {
  catalogName: string;
  description?: string;
};

export function CatalogHero({
  catalogName,
  description = "Browse featured drops, compare performance stats, and blend Neon Shop with archived datasets to find the perfect fit for your workflow.",
}: CatalogHeroProps) {
  return (
    <RevealOnScroll
      className="rounded-[36px] border border-gray-200 bg-gray-50/80 px-6 py-10 text-center shadow-[0_24px_70px_-50px_rgba(15,23,42,0.45)] lg:px-10 lg:py-12 lg:text-left"
      startY={32}
      startOpacity={0}
      threshold={0.2}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Product catalog</p>
      <h2 className="mt-3 text-3xl font-semibold text-gray-900 sm:text-4xl">{catalogName}</h2>
      <p className="mt-4 text-base text-gray-600 lg:max-w-3xl">{description}</p>
    </RevealOnScroll>
  );
}
