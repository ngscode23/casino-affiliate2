import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import ProductMetadata from "@/components/ProductMetadata";
import ProductView from "./ProductView";
import { fetchProduct, fetchSimilarProducts } from "./data";
import { siteConfig } from "@/lib/site-config";

type RouteParams = Promise<{ slug: string }>;
type ProductPageProps = {
  params: RouteParams;
};

export const revalidate = 90;

function decodeJwtPayload(token: string): Record<string, any> | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const base64Payload = parts[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
  const padded = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, "=");
  try {
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

async function resolveUserRoleFromCookies(): Promise<{ role: string; isAdmin: boolean }> {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();

  const directToken = all.find((cookie) => {
    if (!cookie?.value) return false;
    if (cookie.name === "sb-access-token") return true;
    return /-access-token$/.test(cookie.name ?? "");
  });

  let accessToken = directToken?.value ?? null;
  if (!accessToken) {
    const supabaseAuth = all.find((cookie) => cookie.name === "supabase-auth-token");
    if (supabaseAuth?.value) {
      try {
        const parsed = JSON.parse(supabaseAuth.value);
        const tokenValue = parsed?.access_token;
        if (typeof tokenValue === "string" && tokenValue.trim()) {
          accessToken = tokenValue.trim();
        }
      } catch {
        // ignore malformed cookie
      }
    }
  }

  if (!accessToken) {
    return { role: "user", isAdmin: false };
  }

  const payload = decodeJwtPayload(accessToken) ?? {};
  const appMeta = (payload.app_metadata ?? payload.user_metadata ?? {}) as Record<string, unknown>;

  const rawRole =
    typeof appMeta.role === "string"
      ? appMeta.role
      : Array.isArray(appMeta.roles) && typeof appMeta.roles[0] === "string"
        ? appMeta.roles[0]
        : "user";

  const role = rawRole.trim() || "user";
  return { role, isAdmin: role === "admin" };
}

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

  const origin =
    (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.NEXT_SITE_URL || "https://neon4.vercel.app").replace(/\/$/, "");
  const canonicalPath = `/products/${product.slug}`;
  const canonicalUrl = origin ? `${origin}${canonicalPath}` : canonicalPath;
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
    resolveUserRoleFromCookies(),
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
