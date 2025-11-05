import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductGrid, type ProductGridItem } from "@/components/ProductGrid";
import { HeroSliderClient } from "@/components/hero-slider-client";
import type { HeroSlide } from "@/components/hero-slider";
import { BannerSlider } from "@/components/banner-slider";
import { serializeJsonLd, makeOrganizationLD } from "@shared/lib/jsonld";
import { createClient } from "@/utils/supabase/server";
import { loadProductsData } from "./products/data";
import type { Product } from "./products/types";
import { formatPrice } from "./products/utils";

const numberFormatter = new Intl.NumberFormat("en-US");

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline || siteConfig.description}`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: { title: siteConfig.name, description: siteConfig.description, url: "/" },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description },
};

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.role && String(user.role).toLowerCase() === "admin") {
    redirect("/admin");
  }

  const { products, structuredData } = await loadProductsData();
  const heroSlides = buildHeroSlides(products.length);
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

      <section aria-labelledby="storefront-hero" className="scroll-mt-28">
        <div className="rounded-[48px] shadow-[0_40px_120px_-60px_rgba(16,23,40,0.7)]">
          <HeroSliderClient slides={heroSlides} className="rounded-[48px]" />
        </div>
      </section>

      <BannerSlider />

      <FeaturedProducts products={featuredProducts} totalProducts={products.length} />

      <section className="relative overflow-hidden rounded-[calc(var(--radius)+1rem)] border border-border/40 bg-card/60 px-6 py-16 text-center shadow-card sm:px-10 sm:py-20 lg:flex lg:items-center lg:justify-between lg:text-left">
        <div className="flex-1 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Admin toolkit</p>
          <h3 className="text-2xl font-semibold text-fg lg:text-3xl">Command centre for partners &amp; payouts</h3>
          <p className="text-sm text-muted">
            Manage catalogue metadata, click &amp; conversion events, and partner compliance from one responsive
            dashboard. Extend APIs with Edge Functions when you need bespoke workflows.
          </p>
        </div>
        <div className="mt-8 flex justify-center lg:mt-0 lg:justify-end">
          <Link
            href="/admin"
            className="inline-flex h-12 items-center justify-center rounded-full border border-primary/60 bg-primary px-8 text-sm font-semibold text-primaryfg shadow-[0_28px_68px_-30px_rgba(252,50,114,0.72)] transition hover:-translate-y-[1px] hover:shadow-[0_36px_84px_-32px_rgba(252,50,114,0.84)]"
          >
            Open admin
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeaturedProducts({ products, totalProducts }: { products: Product[]; totalProducts: number }) {
  if (!products.length) {
    return (
      <section className="rounded-[32px] border border-border/50 bg-card/70 px-6 py-16 text-center shadow-soft sm:px-10">
        <div className="mx-auto max-w-xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Catalog</p>
          <h2 className="text-2xl font-semibold text-fg">Products will appear here soon</h2>
          <p className="text-sm text-muted">
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
          <p className="text-sm text-muted">Browse {formattedTotal} items curated for high-converting storefronts.</p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-full border border-border/40 bg-card/60 px-5 py-2 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          Browse all &rarr;
        </Link>
      </div>

      <div className="rounded-[30px] border border-border/30 bg-card/85 px-6 py-8 shadow-[0_24px_80px_-52px_rgba(16,24,40,0.45)] sm:px-8 sm:py-10">
        <ProductGrid items={items} layout="grid" showAddToCart wrapWithContainer={false} />
      </div>
    </section>
  );
}

function buildHeroSlides(totalProducts: number): HeroSlide[] {
  const formattedTotal = numberFormatter.format(totalProducts);

  return [
    {
      id: "storefront",
      eyebrow: "# Storefront ready",
      title: "Your product grid is ready to sell",
      description:
        "Beautiful cards, inventory badges, and wishlists are baked in. Sync products from Supabase or seed our demo catalog in minutes.",
      primaryCta: { label: "Preview components", href: "#featured" },
      secondaryCta: { label: "Browse catalog", href: "/products" },
      highlights: ["Shoppable cards", "Inventory states", "Wishlist toggle"],
      visual: "storefront",
      backgroundClass: "bg-gradient-to-br from-[#0b1228] via-[#121f3f] to-[#080d1c]",
    },
    {
      id: "checkout",
      eyebrow: "# Checkout flows",
      title: "Polished checkout for mobile and desktop",
      description:
        "Auto-applied taxes, responsive layouts, and wallet-ready payment buttons come configured out of the box so you can launch faster.",
      primaryCta: { label: "Review checkout", href: "/checkout" },
      secondaryCta: { label: "See pricing", href: "/products" },
      highlights: ["Secure payments", "Wallet buttons", "One-click upsells"],
      visual: "checkout",
      backgroundClass: "bg-gradient-to-br from-[#101b34] via-[#16294d] to-[#091021]",
    },
    {
      id: "analytics",
      eyebrow: "# Partner analytics",
      title: "Monitor clicks, conversions, and payouts",
      description:
        "Track partner performance in real time with Supabase analytics. Export reports, trigger loyalty perks, and keep partners motivated.",
      primaryCta: { label: "Open dashboard", href: "/admin" },
      secondaryCta: { label: "Read docs", href: "/contact" },
      highlights: ["Realtime dashboards", "Automated reports", `${formattedTotal}+ catalog items`],
      visual: "reviews",
      backgroundClass: "bg-gradient-to-br from-[#0f172a] via-[#1a2d56] to-[#0a1226]",
    },
  ];
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
