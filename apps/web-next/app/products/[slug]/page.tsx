import { mutedTextSmLegacy } from "@/styles/classnames";
// app/products/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { serializeJsonLd } from "@shared/lib/jsonld";
import ProductMetadata from "@/components/ProductMetadata";
import ProductView from "./ProductView";
import ProductsClient from "../products-client";
import { loadProductsData } from "../data";
import { resolveFilterParams } from "../filter-params";
import { fetchProduct, fetchSimilarProducts } from "./data";
import { fetchCatalogCategoryBySlug, type CatalogCategory } from "@/lib/catalog/categories";
import { siteConfig } from "@/lib/site-config";

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
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const { slug } = params;
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.NEXT_SITE_URL || "https://neon4.vercel.app").replace(/\/$/, "");
  const brand = siteConfig.name || "Neon Shop";
  const category = await fetchCatalogCategoryBySlug(slug);

  if (category) {
    const canonicalPath = `/products/${category.slug}`;
    const canonicalUrl = origin ? `${origin}${canonicalPath}` : canonicalPath;
    const description =
      category.description?.slice(0, 180) ??
      `Подборка товаров «${category.title}»: отсортируйте по популярности, цене или рейтингу и найдите актуальные предложения.`;

    return {
      title: `${category.title} | Каталог Neon Shop`,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: "website",
        title: `${category.title} | Каталог Neon Shop`,
        description,
        url: canonicalUrl,
      },
      twitter: {
        card: "summary_large_image",
        title: `${category.title} | Каталог Neon Shop`,
        description,
      },
    };
  }

  const product = await fetchProduct(slug);

  if (product) {
    const description = product.description ?? product.shortDescription ?? "";
    const canonicalPath = `/products/${product.slug}`;
    const canonicalUrl = origin ? `${origin}${canonicalPath}` : canonicalPath;
    const cover = product.gallery.length ? product.gallery[0] : null;

    return {
      title: `${product.title} | Купить в Neon Shop`,
      description: description.slice(0, 160),
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: "website",
        title: `${product.title} | Купить в Neon Shop`,
        description,
        url: canonicalUrl,
        siteName: brand,
        images: cover ? [{ url: cover }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: `${product.title} | Купить в Neon Shop`,
        description,
        images: cover ? [cover] : undefined,
      },
    };
  }

  return { title: `Товар не найден | ${brand}` };
}export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const { slug } = params;

  const category = await fetchCatalogCategoryBySlug(slug);

  if (category) {
    return renderCategoryListing(category, resolvedSearchParams ?? {});
  }

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
          // ProductView ожидает href — адаптируем ссылки
          breadcrumbs={breadcrumbs.map((b) => ({ name: b.name, href: b.url }))}
          admin={{ isAdmin, clicks: adminMetrics.clicks, impressions: adminMetrics.impressions }}
          similar={similar}
        />
      </main>
    </div>
  );
}

async function renderCategoryListing(
  category: CatalogCategory,
  rawSearchParams: Record<string, string | string[] | undefined>,
) {
  const filters = resolveFilterParams(rawSearchParams);
  const listing = await loadProductsData({
    query: filters.query,
    dataset: filters.dataset,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    minRating: filters.minRating,
    sort: filters.sort,
    category: category.slug,
  });

  if (listing.fetchError && !listing.products.length) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">{category.title}</h1>
        <p className="mt-4 text-red-500">
          Не удалось загрузить товары: {String((listing.fetchError as any)?.message ?? listing.fetchError)}
        </p>
        <Link href="/products" className="mt-6 inline-flex items-center text-sm text-blue-400 hover:text-blue-300">
          Вернуться в общий каталог
        </Link>
      </div>
    );
  }

  const description =
    category.description ??
    `Подборка «${category.title}»: используйте фильтры, чтобы сравнить бренды, цены и популярность, а затем оформите заказ без переходов по меню.`;

  return (
    <div className="bg-background">
      {listing.structuredData ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(listing.structuredData) }}
        />
      ) : null}
      <section>
        <div className="mx-auto max-w-screen-xl space-y-6 px-6 pt-12 pb-0 sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
          <header className="flex flex-col gap-3 text-center sm:text-left">
            <span className="text-sm font-medium text-muted">Категория каталога</span>
            <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{category.title}</h1>
            <p className="text-base text-muted sm:max-w-3xl">{description}</p>
            {typeof listing.totalCount === "number" ? (
              <span className={mutedTextSmLegacy}>Всего позиций: {listing.totalCount}</span>
            ) : null}
          </header>
        </div>
        <ProductsClient
          products={listing.products}
          categories={listing.categories}
          catalogName={category.title}
          initialQuery={filters.query}
          initialCategory={category.slug}
          initialDataset={filters.dataset}
          initialSort={filters.sort}
          initialPriceMin={filters.priceMin}
          initialPriceMax={filters.priceMax}
          initialMinRating={filters.minRating}
          totalAvailable={listing.totalCount}
        />
      </section>
    </div>
  );
}





