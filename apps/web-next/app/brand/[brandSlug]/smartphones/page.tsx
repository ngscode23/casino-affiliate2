import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { buildCanonical } from "@/lib/env/siteUrl";
import { siteConfig } from "@/lib/site-config";
import { fetchBrandBySlug, fetchBrandSeries, normalizeBrand } from "@/lib/catalog/smartphones";

type PageProps = {
  params: Promise<{ brandSlug: string }>;
};

const SITE_NAME = siteConfig.name || "Neon Shop";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brandSlug } = await params;
  const normalized = normalizeBrand(brandSlug);
  if (!normalized) return { title: `Brand not found | ${SITE_NAME}`, robots: { index: false, follow: false } };
  const brand = await fetchBrandBySlug(normalized);
  if (!brand) return { title: `Brand not found | ${SITE_NAME}`, robots: { index: false, follow: false } };
  const canonical = buildCanonical(`/brand/${brand.slug}/smartphones`);
  const title = `${brand.name} smartphone series | ${SITE_NAME}`;
  const description = `Choose a ${brand.name} smartphone series to browse models.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BrandSmartphonesPage({ params }: PageProps) {
  const { brandSlug } = await params;
  const normalized = normalizeBrand(brandSlug);
  if (!normalized) notFound();
  const brand = await fetchBrandBySlug(normalized);
  if (!brand) notFound();
  if (brand.slug && brand.slug !== brandSlug) {
    redirect(`/brand/${brand.slug}/smartphones`);
  }

  const series = await fetchBrandSeries(brand.slug);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <nav className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/brand" className="font-medium text-muted hover:text-fg">
              Brands
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/brand/${brand.slug}`} className="font-medium text-muted hover:text-fg">
              {brand.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-fg">Smartphones</li>
        </ol>
      </nav>

      <header className="mt-6 space-y-3">
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">
          {brand.name} smartphone series
        </h1>
        <p className="text-base text-muted">Pick a series to explore available models.</p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {series.length ? (
          series.map((item) => (
            <Link
              key={item.slug}
              href={`/brand/${brand.slug}/smartphones/${item.slug}`}
              className="group rounded-2xl border border-border/40 bg-card/80 p-5 shadow-soft transition hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="text-lg font-semibold text-fg group-hover:text-primary">
                {item.title}
              </div>
              <div className="mt-2 text-sm text-muted">
                {item.modelsCount} models · {item.skusCount} SKUs
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-border/40 bg-card/70 p-6 text-sm text-muted">
            No series found for this brand yet.
          </div>
        )}
      </section>
    </div>
  );
}
