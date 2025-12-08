import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductMetadata from "@/components/ProductMetadata";
import ProductView from "./ProductView";
import { fetchProduct, fetchSimilarProducts } from "./data";
import { siteConfig } from "@/lib/site-config";
import { ProductAnalytics } from "@/components/analytics/EcommerceEvents";
import { getUserRoleFromRequest } from "@/lib/auth/roles";
import { buildCanonical } from "@/lib/env/siteUrl";

type RouteParams = Promise<{ slug: string }>;
type ProductPageProps = {
  params: RouteParams;
};

export const revalidate = 90;

function buildBreadcrumbs(product: Awaited<ReturnType<typeof fetchProduct>>) {
  const trail: { name: string; url: string }[] = [{ name: "Каталог", url: "/products" }];
  const categorySlug = product?.category?.slug;
  if (categorySlug) {
    const categoryName = product.category?.name ?? "Категория";
    const url = `/products?category=${encodeURIComponent(categorySlug)}`;
    trail.push({ name: categoryName, url });
  }
  return trail;
}

// SEO metadata
export async function generateMetadata({ params }: Pick<ProductPageProps, "params">): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = typeof resolvedParams?.slug === "string" ? resolvedParams.slug.trim() : "";
  const brand = siteConfig.name || "Neon Shop";

  if (!slug) {
    return {
      title: `Товар не найден | ${brand}`,
      robots: { index: false, follow: false },
    };
  }

  const product = await fetchProduct(slug);
  if (!product) {
    return {
      title: `Товар не найден | ${brand}`,
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = `/products/${product.slug}`;
  const canonicalUrl = buildCanonical(canonicalPath);
  const metaTitle = `${product.title} | ${brand}`;
  const descriptionSource = product.description ?? product.shortDescription ?? product.title;
  const metaDescription = descriptionSource ? descriptionSource.slice(0, 160) : brand;
  const cover = product.gallery[0] ?? product.mainImage ?? product.fallbackImage ?? null;

  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title: metaTitle,
      description: metaDescription,
      url: canonicalUrl,
      siteName: brand,
      images: cover ? [{ url: cover }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const slug = typeof resolvedParams?.slug === "string" ? resolvedParams.slug.trim() : "";
  if (!slug) return notFound();

  const product = await fetchProduct(slug);
  if (!product) return notFound();

  const [similar, roleInfo] = await Promise.all([
    fetchSimilarProducts(product.category?.slug ?? "", product.id, 8),
    getUserRoleFromRequest(),
  ]);
  const isAdmin = roleInfo.isAdmin;
  const breadcrumbs = buildBreadcrumbs(product);
  const canonicalPath = `/products/${product.slug}`;
  const adminMetrics = {
    clicks: product.clicks ?? 0,
    impressions: product.impressions ?? 0,
  };

  return (
    <div className="bg-background">
      <ProductAnalytics
        product={{
          id: product.id,
          title: product.title,
          price: product.price,
          currency: product.currency,
          category: product.category?.slug ?? null,
          brand: product.brand ?? null,
        }}
      />
      <ProductMetadata product={product} breadcrumbs={breadcrumbs} canonicalPath={canonicalPath} />
      <main className="mx-auto max-w-screen-xl space-y-12 px-6 py-10 sm:px-8 lg:px-10">
        <ProductView
          product={product}
          breadcrumbs={breadcrumbs.map((b) => ({ name: b.name, href: b.url }))}
          admin={{ isAdmin, clicks: adminMetrics.clicks, impressions: adminMetrics.impressions }}
          similar={similar}
        />
      </main>
    </div>
  );
}
