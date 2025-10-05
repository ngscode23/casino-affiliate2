import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { getFallbackImage } from "./products/fallback-images";

type RawProduct = {
  id: string;
  slug: string;
  title: string;
  short_desc: string | null;
  price: number | null;
  images: unknown;
};

type Product = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  mainImage: string | null;
};

function extractImage(images: unknown): string | null {
  if (!images) return null;
  if (typeof images === "string") return images || null;
  if (Array.isArray(images)) {
    for (const entry of images) {
      if (typeof entry === "string" && entry) return entry;
      if (entry && typeof entry === "object") {
        const candidate =
          (entry as Record<string, unknown>).url ??
          (entry as Record<string, unknown>).src ??
          (entry as Record<string, unknown>).href;
        if (typeof candidate === "string" && candidate) return candidate;
      }
    }
  }
  return null;
}

function formatPrice(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return `${value?.toFixed?.(2) ?? "0.00"} ${currency}`;
  }
}

async function getFeaturedProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data } = await supabase
    .from("ecom_products")
    .select("id, slug, title, short_desc, price, images, status")
    .in("status", ["active", "published"])
    .order("created_at", { ascending: false })
    .limit(6);

  const products = (data || []) as RawProduct[];
  return products.map((raw, index) => ({
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.short_desc ?? null,
    price: raw.price ?? 0,
    mainImage: extractImage(raw.images) ?? getFallbackImage(index),
  }));
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.role && String(user.role).toLowerCase() === "admin") {
    redirect("/admin");
  }

  const featured = await getFeaturedProducts(supabase);

  return (
    <main className="min-h-screen">
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-24 text-center">
          <span className="rounded-full bg-slate-700/70 px-4 py-1 text-sm uppercase tracking-wide">
            Modern affiliate storefront
          </span>
          <h1 className="text-4xl font-semibold sm:text-5xl">
            Build a Next.js + Supabase affiliate hub
          </h1>
          <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
            Starter templates, real-time product data, and secure auth out of the box. Supabase handles the
            database, auth, and storage so your team can focus on growing revenue.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/products"
              className="rounded-md bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Browse products
            </Link>
            <Link
              href="/contact"
              className="rounded-md border border-white/60 px-6 py-3 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
            >
              Talk to the team
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Featured products</h2>
            <p className="mt-1 text-sm text-slate-600">Fresh arrivals and the latest additions.</p>
          </div>
          <Link href="/products" className="text-sm font-medium text-blue-600 hover:underline">
            Browse all →
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No active products yet.</p>
        ) : (
          <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
            {featured.map((product) => (
              <li
                key={product.id}
                className="overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <Link href={`/products/${product.slug}`} className="block h-full">
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    {product.mainImage ? (
                      <Image
                        src={product.mainImage}
                        alt={product.title}
                        fill
                        sizes="(max-width:768px) 100vw, 33vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <div className="line-clamp-1 text-sm font-medium text-slate-900" title={product.title}>
                      {product.title}
                    </div>
                    <div className="mt-1 line-clamp-2 min-h-[2.75rem] text-xs text-slate-600">
                      {product.description || "No description provided"}
                    </div>
                    <div className="mt-3 text-base font-semibold text-slate-900">
                      {formatPrice(product.price)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 text-center sm:flex-row sm:items-center sm:text-left">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-900">Admin toolkit and APIs</h3>
            <p className="mt-2 text-sm text-slate-600">
              Manage your catalog, click/impression events, and partner metadata in one dashboard. Admin routes
              can be proxied to Supabase or expanded with custom functions.
            </p>
          </div>
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Open admin
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
