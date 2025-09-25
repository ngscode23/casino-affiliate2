import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";

type RawProduct = {
  id: string;
  slug: string;
  title: string;
  short_desc: string | null;
  price: number | null;
  images: unknown;
  status?: string | null;
};

type Product = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  mainImage: string | null;
  clicks: number;
  impressions: number;
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

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const supabase = await createClient();

  // Try modern ecom_products first, then fallback to products
  let fetchErr: any = null;
  let rawProducts: RawProduct[] = [];
  try {
    const { data, error } = await supabase
      .from("ecom_products")
      .select("id, slug, title, short_desc, price, images, status")
      .order("created_at", { ascending: false });
    if (!error && data) {
      rawProducts = (data as RawProduct[]).filter((raw) => raw.status !== "archived");
    } else {
      fetchErr = error;
    }
  } catch (e) {
    fetchErr = e;
  }

  if (!rawProducts.length) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, title, description, price_cents, currency, main_image_url, status")
        .order("created_at", { ascending: false });
      if (!error && data) {
        rawProducts = (data as any[])
          .filter((row) => (row?.status ?? "active") === "active")
          .map((row) => ({
            id: String(row.id),
            slug: String(row.slug),
            title: String(row.title),
            short_desc: (row.description as string) ?? null,
            price: typeof row.price_cents === "number" ? row.price_cents / 100 : null,
            images: row.main_image_url ?? null,
            status: row.status ?? "active",
          } satisfies RawProduct));
        fetchErr = null;
      } else if (error) {
        fetchErr = error;
      }
    } catch (e) {
      fetchErr = e;
    }
  }

  if (fetchErr && !rawProducts.length) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="mt-4 text-red-600">Failed to load products: {String(fetchErr?.message ?? fetchErr)}</p>
      </div>
    );
  }

  const productIds = rawProducts.map((raw) => raw.id);
  let clickCounts = new Map<string, number>();
  let impressionCounts = new Map<string, number>();

  if (productIds.length > 0) {
    try {
      // Prefer shop_* if present, else fallback to product_*
      let clickRes = await supabase.from("shop_clicks").select("product_id").in("product_id", productIds);
      if (clickRes.error) {
        clickRes = await supabase.from("product_clicks").select("product_id").in("product_id", productIds);
      }
      let impressionRes = await supabase
        .from("shop_impressions")
        .select("product_id")
        .in("product_id", productIds);
      if (impressionRes.error) {
        impressionRes = await supabase.from("product_impressions").select("product_id").in("product_id", productIds);
      }
      if (!clickRes.error) {
        const tmp = new Map<string, number>();
        for (const r of (clickRes.data as any[] | null | undefined) ?? []) {
          const id = String((r as any)?.product_id || "");
          if (!id) continue;
          tmp.set(id, (tmp.get(id) || 0) + 1);
        }
        clickCounts = tmp;
      }
      if (!impressionRes.error) {
        const tmp2 = new Map<string, number>();
        for (const r of (impressionRes.data as any[] | null | undefined) ?? []) {
          const id = String((r as any)?.product_id || "");
          if (!id) continue;
          tmp2.set(id, (tmp2.get(id) || 0) + 1);
        }
        impressionCounts = tmp2;
      }
    } catch {
      // ignore stats failures; UI will fallback to zeros
    }
  }

  const products: Product[] = rawProducts.map((raw) => ({
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.short_desc ?? null,
    price: raw.price ?? 0,
    mainImage: extractImage(raw.images),
    clicks: clickCounts.get(raw.id) ?? 0,
    impressions: impressionCounts.get(raw.id) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/account" className="text-sm text-blue-600 hover:underline">
          Account
        </Link>
      </div>
      {products.length === 0 ? (
        <p className="text-neutral-500">No products yet.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
          {products.map((product) => (
            <li key={product.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <Link href={`/products/${product.slug}`} className="block">
                <div className="relative aspect-[4/3] bg-neutral-100 border border-neutral-200">
                  {product.mainImage ? (
                    <Image
                      src={product.mainImage}
                      alt={product.title}
                      fill
                      sizes="(max-width:768px) 100vw, 33vw"
                      className="object-contain p-4"
                    />
                  ) : null}
                </div>
                <div className="space-y-2 p-4">
                  <div className="line-clamp-1 text-sm font-medium text-slate-900" title={product.title}>
                    {product.title}
                  </div>
                  <div className="min-h-[2.5rem] text-sm text-neutral-600 line-clamp-2">
                    {product.description || "-"}
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>Clicks: {product.clicks}</span>
                    <span>Impressions: {product.impressions}</span>
                  </div>
                  <div className="text-base font-semibold text-slate-900">
                    {formatPrice(product.price)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
