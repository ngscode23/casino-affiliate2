import { mutedTextSmLegacy } from "@/styles/classnames";
import { Suspense } from "react";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

import Link from "next/link";
import { type ProductGridItem } from "@/components/ProductGrid";
import { HeroSection, HeroSectionSkeleton } from "@/components/HeroSection";
import { FeaturedSkeleton } from "@/components/product-grid/FeaturedSkeleton";
import { HydratedProductGrid } from "@/components/ProductGrid/HydratedProductGrid";
import { RecommendationsWidget } from "@/components/RecommendationsWidget";
import { serializeJsonLd, makeOrganizationLD } from "@shared/lib/jsonld";
import { loadProductsData } from "./products/data";
import type { Product } from "./products/types";
import { formatPrice } from "./products/utils";
import { fetchTopBrandsSmartphones } from "@/lib/catalog/smartphones";

const numberFormatter = new Intl.NumberFormat("en-US");

export const metadata: Metadata = {
  title: "Neon Shop – электроника и аксессуары | Интернет-магазин гаджетов",
  description:
    "Смартфоны, аудио, умный дом, зарядные устройства и аксессуары с быстрой доставкой по Европе. Подарки, акции и гарантия качества.",
  keywords: ["Neon Shop", "электроника", "аксессуары", "магазин гаджетов", "смартфоны", "умный дом"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Neon Shop – электроника и аксессуары",
    description:
      "Подборка проверенных гаджетов и аксессуаров с доставкой: телефоны, аудио, powerbank, умный дом.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neon Shop – электроника и аксессуары",
    description: "Каталог гаджетов, быстрая доставка и поддержка.",
  },
};

export const revalidate = 180;
export const dynamic = "force-static";
export const fetchCache = "force-cache";

export default async function HomePage() {
  const [{ products, structuredData }, topBrands] = await Promise.all([
    loadProductsData(),
    fetchTopBrandsSmartphones(12),
  ]);
  const featuredProducts = products.slice(0, 4);
  const origin = (process.env.NEXT_SITE_URL || "").replace(/\/$/, "");

  const orgLd = makeOrganizationLD({ name: siteConfig.name, url: origin || "https://example.com" });

  return (
    <div className="relative z-10 flex flex-col gap-16 lg:gap-20">
      {/* Structured data: product catalogue */}
      {structuredData ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}
      {/* Structured data: organization */}
      {orgLd ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(orgLd) }}
        />
      ) : null}
      <Suspense fallback={<HeroSectionSkeleton />}>
        <HeroSection />
      </Suspense>
      <section className="rounded-[28px] border border-border/40 bg-card/70 px-6 py-10 shadow-card sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Top brands</p>
            <h2 className="text-2xl font-semibold text-fg sm:text-3xl">Pick a smartphone brand</h2>
            <p className={mutedTextSmLegacy}>Start browsing by brand, then drill down by series and model.</p>
          </div>
          <Link
            href="/brand"
            className="inline-flex items-center justify-center rounded-full border border-border/40 bg-card/60 px-5 py-2 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
          >
            View all brands &rarr;
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topBrands.length ? (
            topBrands.map((brand) => (
              <Link
                key={brand.slug}
                href={`/brand/${brand.slug}`}
                className="rounded-2xl border border-border/40 bg-card/80 px-4 py-5 text-center text-base font-semibold text-fg shadow-soft transition hover:-translate-y-1 hover:border-primary/40"
              >
                {brand.name}
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-border/40 bg-card/70 px-4 py-5 text-sm text-muted">
              Brands will appear here soon.
            </div>
          )}
        </div>
      </section>
      <Suspense fallback={<FeaturedSkeleton />}>
        <FeaturedProducts products={featuredProducts} totalProducts={products.length} />
      </Suspense>
      {/* Персональные рекомендации на главной */}
      <section className="relative overflow-hidden rounded-[28px] border border-border/40 bg-card/70 px-4 py-8 shadow-card sm:px-8 sm:py-12">
        <RecommendationsWidget limit={12} />
      </section>
    </div>
  );
}

type FeaturedGridStyle = CSSProperties & {
  "--vc-grid-max-width"?: string;
  "--vc-grid-column-gap"?: string;
  "--vc-grid-row-gap"?: string;
  "--vc-padding-top-desktop"?: string;
  "--vc-card-width"?: string;
  "--vc-card-min-width"?: string;
};

const FEATURED_GRID_STYLE: FeaturedGridStyle = {
  "--vc-grid-max-width": "1260px",
  "--vc-grid-column-gap": "32px",
  "--vc-grid-row-gap": "28px",
  "--vc-padding-top-desktop": "20px",
  "--vc-card-width": "520px",
  "--vc-card-min-width": "320px",
};

function FeaturedProducts({ products, totalProducts }: { products: Product[]; totalProducts: number }) {
  if (!products.length) {
    return (
      <section className="rounded-[32px] border border-border/50 bg-card/70 px-6 py-16 text-center shadow-soft sm:px-10">
        <div className="mx-auto max-w-xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Catalog</p>
          <h2 className="text-2xl font-semibold text-fg">Products will appear here soon</h2>
          <p className={mutedTextSmLegacy}>
            Sync items from Supabase or seed the demo catalog to preview storefront components instantly.
          </p>
          <div className="flex justify-center">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full border border-primary/60 bg-primary px-6 py-2.5 text-sm font-semibold text-primaryfg transition hover:-translate-y-[1px]"
            >
              Open admin
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const formattedTotal = numberFormatter.format(totalProducts);
  const curated = pickFeaturedProducts(products, 4);
  const items: ProductGridItem[] = curated.map((product) => {
    const priceValue = Number(product.price ?? 0);
    const badge = product.isNew ? "new" : product.isTop ? "bestseller" : null;
    const rawDiscountPercent =
      typeof product.discountPercent === "number" && product.discountPercent > 0 ? product.discountPercent : null;
    const discountPercent =
      rawDiscountPercent != null && rawDiscountPercent > 0 ? Math.round(rawDiscountPercent) : null;
    let originalPrice: string | null = null;
    if (rawDiscountPercent && rawDiscountPercent > 0 && rawDiscountPercent < 100 && priceValue > 0) {
      const base = priceValue / (1 - rawDiscountPercent / 100);
      if (Number.isFinite(base) && base > priceValue) {
        originalPrice = formatPrice(base);
      }
    }
    if (!originalPrice) {
      const rawOriginal = typeof product.originalPrice === "number" ? product.originalPrice : null;
      if (typeof rawOriginal === "number" && rawOriginal > priceValue) {
        originalPrice = formatPrice(rawOriginal);
      }
      const rawOriginalCents =
        typeof product.originalPriceCents === "number" ? product.originalPriceCents : null;
      if (!originalPrice && typeof rawOriginalCents === "number" && rawOriginalCents > priceValue * 100) {
        originalPrice = formatPrice(rawOriginalCents / 100);
      }
    }
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      subtitle: product.description,
      image: product.mainImage,
      price: priceValue > 0 ? formatPrice(priceValue) : null,
      originalPrice,
      badge,
    };
  });

  return (
    <section
      id="featured"
      aria-labelledby="featured-products-heading"
      className="mx-auto max-w-screen-xl space-y-10 px-6 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16 lg:space-y-12"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Featured products</p>
          <h2 id="featured-products-heading" className="text-3xl font-semibold text-fg sm:text-4xl">
            Fresh arrivals and the latest additions.
          </h2>
          <p className={mutedTextSmLegacy}>Browse {formattedTotal} items curated for high-converting storefronts.</p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-full border border-border/40 bg-card/60 px-5 py-2 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          Browse all &rarr;
        </Link>
      </div>
      <div
        className="mx-auto w-full max-w-[1260px] rounded-[30px] bg-card/85 px-6 py-8 shadow-soft sm:px-8 sm:py-10"
        style={FEATURED_GRID_STYLE}
      >
        <HydratedProductGrid
          items={items}
          layout="grid"
          showAddToCart
          wrapWithContainer={false}
          skeletonCount={4}
        />
      </div>
    </section>
  );
}

function looksLikePlaceholderTitle(title: string): boolean {
  if (!title) return true;
  const condensed = title.replace(/\s+/g, "");
  return condensed.length >= 6 && /^[a-z0-9]+$/i.test(condensed);
}

function pickFeaturedProducts(products: Product[], desired = 4): Product[] {
  const priority = products.filter((product) => {
    const priceValue = Number(product.price ?? 0);
    if (priceValue <= 0) return false;
    if (looksLikePlaceholderTitle(product.title)) return false;
    return true;
  });

  const curated = priority.slice(0, desired);

  if (curated.length < desired) {
    for (const product of products) {
      if (curated.includes(product)) continue;
      curated.push(product);
      if (curated.length === desired) break;
    }
  }

  return curated;
}

// no custom card here; featured uses the canonical ProductGrid

