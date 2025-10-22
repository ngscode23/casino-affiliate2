// app/products/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import ProductMetadata from "@/components/ProductMetadata";
import ProductView from "./ProductView";
import { PRODUCT_PAGE_REVALIDATE_SECONDS, fetchProduct, fetchSimilarProducts } from "./data";

export const revalidate = PRODUCT_PAGE_REVALIDATE_SECONDS;

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
  const appMeta = (payload.app_metadata ??
    payload.user_metadata ??
    {}) as Record<string, unknown>;

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
  // ProductMetadata ждёт Breadcrumb[] с полем url
  const trail: { name: string; url: string }[] = [
    { name: "Каталог", url: "/products" },
  ];
  const categorySlug = product?.category?.slug;
  if (categorySlug) {
    const categoryName = product.category?.name ?? "Категория";
    const url = `/products?category=${encodeURIComponent(categorySlug)}`;
    trail.push({ name: categoryName, url });
  }
  return trail;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;                // ← тут await обязателен
  const product = await fetchProduct(slug);
  if (!product) return { title: "Товар не найден" };

  const description = product.description ?? product.shortDescription ?? "";
  const canonicalPath = `/products/${product.slug}`;

  return {
    title: `${product.title} — купить онлайн`,
    description: description.slice(0, 160),
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      url: canonicalPath,
      images: product.gallery.length ? [{ url: product.gallery[0] }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: product.gallery.length ? [product.gallery[0]] : undefined,
    },
  };
}

export default async function ProductPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;                // ← и тут тоже
  const product = await fetchProduct(slug);
  if (!product) return notFound();

  const status = (product.status ?? "").toLowerCase();
  if (!(status === "published" || status === "active")) return notFound();

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
      <ProductMetadata
        product={product}
        breadcrumbs={breadcrumbs} // { name, url }
        canonicalPath={canonicalPath}
      />
      <main className="mx-auto max-w-screen-xl space-y-12 px-6 py-10 sm:px-8 lg:px-10">
        <ProductView
          product={product}
          // если ProductView ждёт href — адаптируем локально:
          breadcrumbs={breadcrumbs.map(b => ({ name: b.name, href: b.url }))}
          admin={{ isAdmin, clicks: adminMetrics.clicks, impressions: adminMetrics.impressions }}
          similar={similar}
        />
      </main>
    </div>
  );
}
