import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { buildCanonical } from "@/lib/env/siteUrl";
import { siteConfig } from "@/lib/site-config";
import {
  fetchBrandBySlug,
  fetchSeriesBySlug,
  fetchSeriesModels,
  normalizeBrand,
} from "@/lib/catalog/smartphones";
import { normalizeSlug } from "@/lib/catalog/slug";
import { formatPrice } from "@/app/products/utils";

type PageProps = {
  params: Promise<{ brandSlug: string; seriesSlug: string }>;
};

const SITE_NAME = siteConfig.name || "Neon Shop";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brandSlug, seriesSlug } = await params;
  const normalizedBrand = normalizeBrand(brandSlug);
  const normalizedSeries = normalizeSlug(seriesSlug);
  if (!normalizedBrand || !normalizedSeries) {
    return { title: `Series not found | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }
  const brand = await fetchBrandBySlug(normalizedBrand);
  if (!brand) {
    return { title: `Series not found | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }
  const series = await fetchSeriesBySlug(brand.slug, normalizedSeries);
  if (!series) {
    return { title: `Series not found | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }
  const canonical = buildCanonical(`/brand/${brand.slug}/smartphones/${series.slug}`);
  const title = `${brand.name} ${series.title} | ${SITE_NAME}`;
  const description = `Browse ${brand.name} ${series.title} smartphone models.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BrandSeriesPage({ params }: PageProps) {
  const { brandSlug, seriesSlug } = await params;
  const normalizedBrand = normalizeBrand(brandSlug);
  const normalizedSeries = normalizeSlug(seriesSlug);
  if (!normalizedBrand || !normalizedSeries) notFound();

  const brand = await fetchBrandBySlug(normalizedBrand);
  if (!brand) notFound();

  const series = await fetchSeriesBySlug(brand.slug, normalizedSeries);
  if (!series) notFound();

  if (brand.slug !== brandSlug || series.slug !== seriesSlug) {
    redirect(`/brand/${brand.slug}/smartphones/${series.slug}`);
  }

  const models = await fetchSeriesModels(brand.slug, series.slug);

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
          <li>
            <Link href={`/brand/${brand.slug}/smartphones`} className="font-medium text-muted hover:text-fg">
              Smartphones
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-fg">{series.title}</li>
        </ol>
      </nav>

      <header className="mt-6 space-y-3">
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">
          {brand.name} {series.title}
        </h1>
        <p className="text-base text-muted">
          Choose a model to view available SKUs and filters.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.length ? (
          models.map((model) => {
            const priceMin =
              typeof model.priceMinCents === "number" ? formatPrice(model.priceMinCents / 100) : null;
            const priceMax =
              typeof model.priceMaxCents === "number" ? formatPrice(model.priceMaxCents / 100) : null;
            const priceLabel =
              priceMin && priceMax && priceMin !== priceMax ? `${priceMin} – ${priceMax}` : priceMin ?? priceMax;
            return (
              <Link
                key={model.id}
                href={`/brand/${brand.slug}/smartphones/${series.slug}/${model.slug}`}
                className="group rounded-2xl border border-border/40 bg-card/80 p-5 shadow-soft transition hover:-translate-y-1 hover:border-primary/40"
              >
                <div className="text-lg font-semibold text-fg group-hover:text-primary">
                  {model.title}
                </div>
                <div className="mt-2 text-sm text-muted">
                  {model.skuCount} SKUs{priceLabel ? ` · ${priceLabel}` : ""}
                </div>
                {model.avgRating ? (
                  <div className="mt-1 text-xs text-muted">Avg rating {model.avgRating.toFixed(1)}</div>
                ) : null}
              </Link>
            );
          })
        ) : (
          <div className="rounded-2xl border border-border/40 bg-card/70 p-6 text-sm text-muted">
            No models found for this series yet.
          </div>
        )}
      </section>
    </div>
  );
}
