import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import ProductCarousel, { getProductsByModel } from "@/components/ProductCarousel";

type PageProps = {
  params: Promise<{
    slug: string;
    brand: string;
    model: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const categoryLabel = formatSegment(resolvedParams.slug);
  const brandLabel = formatSegment(resolvedParams.brand);
  const modelLabel = formatSegment(resolvedParams.model);

  return {
    title: `${brandLabel} ${modelLabel} – варианты и цены`,
    description: `Все вариации ${brandLabel} ${modelLabel} в категории ${categoryLabel}: сравните цвета, объём памяти и цены.`,
  };
}

export default async function ProductModelPage({ params }: PageProps) {
  const resolvedParams = await params;
  const categoryLabel = formatSegment(resolvedParams.slug);
  const brandLabel = formatSegment(resolvedParams.brand);
  const modelLabel = formatSegment(resolvedParams.model);

  const variants = await getProductsByModel(modelLabel);
  const featured = variants[0] ?? null;
  const priceFrom = featured?.price ?? "—";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
      <nav className="text-sm text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/products" className="font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200">
              Каталог
            </Link>
          </li>
          <li>›</li>
          <li>
            <Link
              href={`/products?category=${encodeURIComponent(resolvedParams.slug)}`}
              className="hover:text-slate-900 dark:hover:text-white"
            >
              {categoryLabel}
            </Link>
          </li>
          <li>›</li>
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
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">
              {brandLabel} {modelLabel}
            </h1>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
              Выберите идеальную конфигурацию: цвета, объём памяти и варианты поставки. Мы собираем все модификации в
              одном месте, чтобы вам было проще сравнить и оформить заказ.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-6 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Категория</dt>
                <dd className="text-base font-semibold text-slate-900 dark:text-white">{categoryLabel}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Минимальная цена</dt>
                <dd className="text-base font-semibold text-slate-900 dark:text-white">{priceFrom}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Бренд</dt>
                <dd className="text-base font-semibold text-slate-900 dark:text-white">{brandLabel}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Вариаций</dt>
                <dd className="text-base font-semibold text-slate-900 dark:text-white">{variants.length || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="relative aspect-square overflow-hidden rounded-[36px] border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100 shadow-[0_25px_100px_-60px_rgba(15,23,42,0.6)] dark:border-white/10 dark:from-slate-900 dark:to-slate-800">
          {featured?.image ? (
            <Image
              src={featured.image}
              alt={featured.variantLabel}
              fill
              className="object-contain p-10"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-300">
              Изображение появится позже
            </div>
          )}
        </div>
      </div>

      <ProductCarousel
        model={modelLabel}
        heading={`Все вариации ${brandLabel} ${modelLabel}`}
        initialProducts={variants}
        className="pb-4"
      />
    </div>
  );
}

function formatSegment(value: string): string {
  return decodeURIComponent(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
