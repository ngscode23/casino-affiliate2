// app/products/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProductMetadata from "@/components/ProductMetadata";
import ProductView from "./ProductView";
import { fetchProduct, fetchSimilarProducts } from "./data";

export const dynamic = "force-dynamic";

async function fetchStatCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  productId: string,
) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select("product_id", { count: "exact", head: true })
      .eq("product_id", productId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
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

  const supabase = await createClient();
  const authInfo = await supabase.auth.getUser().catch(() => ({ data: null } as any));
  const role =
    (authInfo?.data?.user?.app_metadata?.role as string | undefined)?.trim()
    || (Array.isArray(authInfo?.data?.user?.app_metadata?.roles)
        && authInfo?.data?.user?.app_metadata?.roles?.[0])
    || "user";
  const isAdmin = role === "admin";

  const clickTables =
    product.dataset === "legacy"
      ? (["product_clicks", "shop_clicks"] as const)
      : (["shop_clicks", "product_clicks"] as const);

  const impressionTables =
    product.dataset === "legacy"
      ? (["product_impressions", "shop_impressions"] as const)
      : (["shop_impressions", "product_impressions"] as const);

  const [clicks, impressions] = await Promise.all([
    fetchStatCount(supabase, clickTables[0], product.id)
      .then(v => (v > 0 ? v : fetchStatCount(supabase, clickTables[1], product.id))),
    fetchStatCount(supabase, impressionTables[0], product.id)
      .then(v => (v > 0 ? v : fetchStatCount(supabase, impressionTables[1], product.id))),
  ]);

  const similar = await fetchSimilarProducts(product.category?.slug ?? "", product.id, 8);
  const breadcrumbs = buildBreadcrumbs(product);
  const canonicalPath = `/products/${product.slug}`;

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
          admin={{ isAdmin, clicks, impressions }}
          similar={similar}
        />
      </main>
    </div>
  );
}
