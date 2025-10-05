"use client";

import Link from "next/link";
import Image from "next/image";
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

export default function WishlistPage() {
  const { items, remove, clear, toggle } = useWishlist();
  const empty = items.length === 0;

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

      {empty ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-neutral-600">No favorites yet.</p>
          <Link href="/products" className="mt-2 inline-flex text-sm text-blue-600 hover:underline">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
          {items.map((product) => (
            <li key={product.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <Link href={`/products/${product.slug}`} className="block">
                <div className="relative aspect-[4/3] bg-neutral-100">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
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
                  <div className="text-base font-semibold text-slate-900">{formatPrice(product.price)}</div>
                </div>
              </Link>
              <div className="flex items-center justify-between border-t bg-white/70 p-3 text-xs">
                <button
                  type="button"
                  onClick={() => toggle(product.id)}
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
          ))}
        </ul>
      )}
    </div>
  );
}
