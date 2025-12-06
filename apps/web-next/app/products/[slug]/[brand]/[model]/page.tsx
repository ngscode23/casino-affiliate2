import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import ProductCarousel, { getProductsByModel } from "@/components/ProductCarousel";
import { siteConfig } from "@/lib/site-config";

type PageProps = {
  params: Promise<{
    slug: string;
    brand: string;
    model: string;
  }>;
};

const formatSegment = (value: string | undefined) =>
  (value ?? "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .trim();

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const categoryLabel = formatSegment(resolvedParams.slug);
  const brandLabel = formatSegment(resolvedParams.brand);
  const modelLabel = formatSegment(resolvedParams.model);
  const origin =
    (process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.NEXT_SITE_URL ||
      "https://neon4.vercel.app").replace(/\/$/, "");
  const canonicalPath = `/products/${resolvedParams.slug}/${resolvedParams.brand}/${resolvedParams.model}`;
  const canonicalUrl = `${origin}${canonicalPath}`;
  const siteName = siteConfig.name || "Neon Shop";
  const title = `${brandLabel} ${modelLabel} | ${siteName}`;
  const description = `Обзор ${brandLabel} ${modelLabel} в категории ${categoryLabel}: сравнение вариантов, цены и характеристики.`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, url: canonicalUrl },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProductModelPage({ params }: PageProps) {
  const resolvedParams = await params;
  const categoryLabel = formatSegment(resolvedParams.slug);
  const brandLabel = formatSegment(resolvedParams.brand);
  const modelLabel = formatSegment(resolvedParams.model);

  const variants = await getProductsByModel(modelLabel);
  const featured = variants[0] ?? null;
  const priceFrom = featured?.price ?? "-";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
      <nav className="text-sm text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/products" className="font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200">
              Каталог
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-400">
            &gt;
          </li>
          <li>
            <Link
              href={`/products?category=${encodeURIComponent(resolvedParams.slug)}`}
              className="hover:text-slate-900 dark:hover:text-white"
            >
              {categoryLabel}
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-400">
            &gt;
          </li>
          <li>
            <span className="font-medium text-slate-900 dark:text-white">
              {brandLabel} {modelLabel}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-500">Модель</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">
            {brandLabel} {modelLabel}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Популярные конфигурации {brandLabel} {modelLabel} в категории {categoryLabel}.
          </p>
          <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/60">
            <ProductCarousel model={modelLabel} initialProducts={variants} />
          </div>
        </div>

        <aside className="space-y-6 rounded-3xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/60">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Бренд</p>
          <div className="text-2xl font-semibold text-slate-900 dark:text-white">{brandLabel}</div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Модель: {modelLabel}
            <br />
            Категория: {categoryLabel}
          </p>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-slate-50 p-4 text-slate-800 dark:border-slate-800/60 dark:bg-slate-800/50 dark:text-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-white">
              ₽
            </div>
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-300">Цена от</div>
              <div className="text-xl font-semibold text-slate-900 dark:text-white">{priceFrom}</div>
            </div>
          </div>
          {featured?.image ? (
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-50 dark:border-slate-800/60 dark:bg-slate-800/50">
              <Image
                src={featured.image}
                alt={`${brandLabel} ${modelLabel}`}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 500px"
              />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
