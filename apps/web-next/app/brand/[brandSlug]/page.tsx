import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { buildCanonical } from "@/lib/env/siteUrl";
import { siteConfig } from "@/lib/site-config";
import { fetchBrandBySlug, normalizeBrand } from "@/lib/catalog/smartphones";

type PageProps = {
  params: Promise<{ brandSlug: string }>;
};

const SITE_NAME = siteConfig.name || "Neon Shop";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brandSlug } = await params;
  const normalized = normalizeBrand(brandSlug);
  if (!normalized) {
    return { title: `Brand not found | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }
  const brand = await fetchBrandBySlug(normalized);
  if (!brand) {
    return { title: `Brand not found | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }
  const canonical = buildCanonical(`/brand/${brand.slug}`);
  const title = `${brand.name} smartphones | ${SITE_NAME}`;
  const description = brand.description?.trim() || `Browse ${brand.name} smartphone series and models.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { brandSlug } = await params;
  const normalized = normalizeBrand(brandSlug);
  if (!normalized) notFound();

  const brand = await fetchBrandBySlug(normalized);
  if (!brand) notFound();

  if (brand.slug && brand.slug !== brandSlug) {
    redirect(`/brand/${brand.slug}`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-8">
      <nav className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/brand" className="font-medium text-muted hover:text-fg">
              Brands
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-fg">{brand.name}</li>
        </ol>
      </nav>

      <header className="mt-6 space-y-3">
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{brand.name}</h1>
        {brand.description ? (
          <p className="text-base text-muted">{brand.description}</p>
        ) : (
          <p className="text-base text-muted">
            Browse {brand.name} smartphone series and models.
          </p>
        )}
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/brand/${brand.slug}/smartphones`}
          className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-soft transition hover:-translate-y-1 hover:border-primary/40"
        >
          <h2 className="text-xl font-semibold text-fg">Smartphones</h2>
          <p className="mt-2 text-sm text-muted">Explore {brand.name} phone series.</p>
        </Link>
      </section>
    </div>
  );
}
