import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ProductImpression from "../components/ProductImpression";
import TrackClickButton from "../components/TrackClickButton";
import { getFallbackImageByKey } from "../fallback-images";

type RawProduct = {
  id: string;
  slug: string;
  title: string;
  short_desc: string | null;
  description?: string | null;
  price: number | null;
  images: unknown;
  status?: string | null;
  currency?: string | null;
  dataset: "shop" | "legacy";
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

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  let raw: RawProduct | null = null;
  try {
    const { data, error } = await supabase
      .from("ecom_products")
      .select("id, slug, title, short_desc, price, images, status")
      .eq("slug", slug)
      .maybeSingle();
    if (!error && data) {
      const row = data as Record<string, unknown>;
      raw = {
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        title: String(row.title ?? "Untitled product"),
        short_desc: (row.short_desc as string) ?? null,
        description: (row.description as string) ?? null,
        price: typeof row.price === "number" ? row.price : null,
        images: row.images,
        status: (row.status as string) ?? null,
        currency: typeof row.currency === "string" ? (row.currency as string) : null,
        dataset: "shop",
      } satisfies RawProduct;
    }
  } catch {}

  if (!raw) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, title, description, price_cents, currency, main_image_url, status")
        .eq("slug", slug)
        .maybeSingle();
      if (!error && data) {
        raw = {
          id: String((data as any).id),
          slug: String((data as any).slug),
          title: String((data as any).title),
          short_desc: ((data as any).description as string) ?? null,
          description: ((data as any).description as string) ?? null,
          price: typeof (data as any).price_cents === "number" ? (data as any).price_cents / 100 : null,
          images: (data as any).main_image_url ?? null,
          status: (data as any).status ?? "active",
          currency: typeof (data as any).currency === "string" ? (data as any).currency : null,
          dataset: "legacy",
        } as RawProduct;
      }
    } catch {}
  }

  if (!raw || raw.status === "archived") {
    return notFound();
  }

  const product = {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description ?? raw.short_desc ?? null,
    price: raw.price ?? 0,
    currency: raw.currency ?? "USD",
    mainImage: extractImage(raw.images),
    dataset: raw.dataset,
  };

  async function stat(primary: string, fallback: string) {
    const first = await fetchStatCount(supabase, primary, product.id);
    if (first > 0) return first;
    return await fetchStatCount(supabase, fallback, product.id);
  }

  const clickTables =
    product.dataset === "legacy"
      ? ["product_clicks", "shop_clicks"] as const
      : ["shop_clicks", "product_clicks"] as const;
  const impressionTables =
    product.dataset === "legacy"
      ? ["product_impressions", "shop_impressions"] as const
      : ["shop_impressions", "product_impressions"] as const;

  const [clicks, impressions] = await Promise.all([
    stat(clickTables[0], clickTables[1]),
    stat(impressionTables[0], impressionTables[1]),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <ProductImpression productId={product.id} dataset={product.dataset} />
      <Link href="/products" className="text-sm text-blue-600 hover:underline">
        Back to products
      </Link>
      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100 border border-neutral-200">
          {product.mainImage ? (
            <Image
              src={product.mainImage}
              alt={product.title}
              fill
              sizes="(max-width:768px) 100vw, 50vw"
              className="object-contain p-6"
            />
          ) : null}
        </div>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <div className="text-sm text-neutral-500">
            <span>Clicks: {clicks}</span>
            <span className="mx-2 text-neutral-400">|</span>
            <span>Impressions: {impressions}</span>
          </div>
          <div className="whitespace-pre-wrap text-neutral-700">
            {product.description ?? "No description provided."}
          </div>
          <div className="text-xl font-bold">{formatPrice(product.price, product.currency)}</div>
          <div className="pt-2">
            <TrackClickButton productId={product.id} dataset={product.dataset} />
          </div>
        </div>
      </div>
    </div>
  );
}
