"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { Product } from "@/app/products/types";
import { ProductGrid, PRODUCT_GRID_CONTAINER } from "@/components/ProductGrid";
import { formatPrice } from "@/app/products/data";
const LS_KEY = "ecom:wishlist";
function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((x) => typeof x === "string");
    if (parsed && Array.isArray(parsed.ids))
      return parsed.ids.filter((x: unknown) => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}
function writeIds(ids: string[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ids }));
  } catch {
    /* ignore */
  }
}
export default function WishlistClient({ products }: { products: Product[] }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(readIds());
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== LS_KEY) return;
      setIds(readIds());
    };
    const onCustom = () => setIds(readIds());
    window.addEventListener("storage", onStorage);
    window.addEventListener("wishlist:update", onCustom as any);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wishlist:update", onCustom as any);
    };
  }, []);
  const items = useMemo(() => {
    if (!ids.length) return [];
    const set = new Set(ids.map(String));
    return products
      .filter((p) => set.has(String(p.id)))
      .map((p, index) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        subtitle: p.description,
        price:
          typeof p.priceCents === "number"
            ? formatPrice(p.priceCents, p.currency)
            : formatPrice(Math.round(Number(p.price || 0) * 100), p.currency),
        originalPrice:
          typeof p.originalPriceCents === "number"
            ? formatPrice(p.originalPriceCents, p.currency)
            : undefined,
        image: p.mainImage ?? undefined,
        badge: p.isNew ? "New" : p.isTop ? "Popular" : null,
        meta: null,
      }));
  }, [ids, products]);
  const clear = useCallback(() => {
    writeIds([]);
    setIds([]);
    try {
      window.dispatchEvent(
        new CustomEvent("wishlist:update", { detail: { ids: [] } }),
      );
    } catch {
      /* ignore */
    }
  }, []);
  if (!ids.length) {
    return (
      <section className={`${PRODUCT_GRID_CONTAINER} pb-16`}>
        {" "}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          {" "}
          <h2 className="text-xl font-semibold text-fg">
            Your wishlist is empty
          </h2>{" "}
          <p className="mt-2 text-sm text-muted">
            Browse the catalog and tap the heart to save items.
          </p>{" "}
        </div>{" "}
      </section>
    );
  }
  return (
    <section className="pb-16">
      {" "}
      <div
        className={`${PRODUCT_GRID_CONTAINER} mb-4 flex items-center justify-between gap-3`}
      >
        {" "}
        <p className="text-sm text-muted">
          Saved items:{" "}
          <span className="font-semibold text-fg">{items.length}</span>
        </p>{" "}
        <button
          type="button"
          onClick={clear}
          className="text-sm text-muted hover:text-fg underline underline-offset-4"
        >
          Clear all
        </button>{" "}
      </div>{" "}
      <ProductGrid items={items} />{" "}
    </section>
  );
}
