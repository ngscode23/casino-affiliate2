"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useWishlist } from "@shared/ecom/lib/wishlist";

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

type WishlistProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency?: string | null;
  image?: string | null;
};

export default function WishlistPage() {
  const { ids, remove, clear } = useWishlist();
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wishlistIds = useMemo(() => Array.from(new Set(ids.map(String).filter(Boolean))), [ids]);
  const empty = wishlistIds.length === 0;

  useEffect(() => {
    let cancelled = false;
    if (!wishlistIds.length) {
      setItems([]);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/ecom-products", window.location.origin);
        url.searchParams.set("ids", wishlistIds.join(","));
        url.searchParams.set("limit", String(Math.max(wishlistIds.length, 16)));
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to load wishlist (status ${res.status})`);
        }
        const json = await res.json();
        if (cancelled) return;
        const rawItems = Array.isArray(json?.items) ? (json.items as any[]) : [];
        const mapped: WishlistProduct[] = rawItems.map((row: any) => ({
          id: String(row?.id ?? ""),
          slug: String(row?.slug ?? ""),
          title: String(row?.title ?? "Untitled"),
          price: typeof row?.price === "number" ? row.price : Number(row?.price ?? 0),
          currency: typeof row?.currency === "string" ? row.currency : null,
          image: Array.isArray(row?.images) && row.images.length ? String(row.images[0]) : row?.image_url ?? null,
        })).filter((item) => item.id && item.slug);
        const byId = new Map(mapped.map((item) => [item.id, item] as const));
        const ordered = wishlistIds.map((id) => byId.get(id)).filter((item): item is WishlistProduct => Boolean(item));
        setItems(ordered);
      } catch (err: any) {
        console.error("wishlist: failed to load", err);
        if (!cancelled) {
          setError(err?.message ? String(err.message) : "Failed to load wishlist");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [wishlistIds]);

  const handleRemove = (id: string) => {
    remove(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold sm:text-4xl">Wishlist</h1>
        {!empty ? (
          <button
            type="button"
            onClick={clear}
            className="text-sm text-blue-600 transition hover:text-blue-500"
          >
            Clear wishlist
          </button>
        ) : null}
      </div>

      {empty && !loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-neutral-600">No favorites yet.</p>
          <Link href="/products" className="mt-2 inline-flex text-sm text-blue-600 hover:underline">
            Browse products
          </Link>
        </div>
      ) : null}

      {!empty && loading ? (
        <div className="space-y-3">
          {Array.from({ length: Math.min(wishlistIds.length, 4) || 4 }).map((_, index) => (
            <div key={index} className="h-24 w-full animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : null}

      {!empty && !loading && error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      {!empty && !loading && !error ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
          {items.map((product) => {
            const imageSrc = product.image || "/og.svg";
            return (
              <li key={product.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                <Link href={`/products/${product.slug}`} className="block">
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={product.title}
                        fill
                        sizes="(max-width:768px) 100vw, 33vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                <div className="space-y-2 p-4">
                  <div className="line-clamp-1 text-sm font-medium text-slate-900" title={product.title}>
                    {product.title}
                  </div>
                  <div className="text-base font-semibold text-slate-900">
                    {formatPrice(product.price, product.currency?.toUpperCase() || "EUR")}
                  </div>
                </div>
              </Link>
              <div className="flex items-center justify-between border-t bg-white/70 p-3 text-xs">
                <button
                  type="button"
                  onClick={() => handleRemove(product.id)}
                  className="rounded-md border border-slate-200 px-3 py-1 text-neutral-700 hover:bg-slate-100"
                >
                  Remove
                </button>
                <Link
                  href={`/products/${product.slug}`}
                  className="rounded-md bg-slate-900 px-3 py-1 font-medium text-white hover:bg-slate-800"
                >
                  View
                </Link>
              </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
