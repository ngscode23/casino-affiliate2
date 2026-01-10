import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/lib/site-config";
import { buildCanonical } from "@/lib/env/siteUrl";
import { fetchTopBrandsSmartphones } from "@/lib/catalog/smartphones";

const SITE_NAME = siteConfig.name || "Neon Shop";

export const metadata: Metadata = {
  title: `Brands | ${SITE_NAME}`,
  description: "Browse top smartphone brands and drill down into series and models.",
  alternates: { canonical: buildCanonical("/brand") },
};

export const revalidate = 300;

export default async function BrandsPage() {
  const brands = await fetchTopBrandsSmartphones(24);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Top brands</p>
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">Smartphone brands</h1>
        <p className="text-base text-muted">
          Pick a brand to browse its smartphone series and models.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.length ? (
          brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brand/${brand.slug}`}
              className="group rounded-2xl border border-border/40 bg-card/80 p-5 shadow-soft transition hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="text-lg font-semibold text-fg group-hover:text-primary">
                {brand.name}
              </div>
              <div className="mt-2 text-sm text-muted">
                {brand.modelsCount} models · {brand.skusCount} SKUs
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-border/40 bg-card/70 p-6 text-sm text-muted">
            No brands found yet.
          </div>
        )}
      </section>
    </div>
  );
}
