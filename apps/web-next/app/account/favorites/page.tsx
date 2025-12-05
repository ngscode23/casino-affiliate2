import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { ProductGrid, type ProductGridItem } from "@/components/ProductGrid";
import { formatCurrency } from "@/app/products/currency";

export const metadata: Metadata = {
  title: "????????? | ???????",
  alternates: { canonical: "/account/favorites" },
};

async function loadFavorites(): Promise<ProductGridItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    redirect("/login");
  }

  // RLS on user_favorites already restricts by auth.uid()
  const { data: favs, error: favError } = await supabase
    .from("user_favorites")
    .select("product_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (favError || !Array.isArray(favs) || favs.length === 0) {
    return [];
  }

  const ids = favs.map((f) => f.product_id).filter(Boolean);
  if (!ids.length) return [];

  // Витрина product_with_discount_with_dataset (колонки в camelCase)
  const { data: products, error: prodError } = await supabase
    .from("product_with_discount_with_dataset")
    .select(
      'id, slug, name, "priceCents", "effectivePriceCents", "basePriceCents", currency, thumbnail, thumbnail_path, rating',
    )
    .in("id", ids);

  if (prodError || !Array.isArray(products)) {
    return [];
  }

  const byId = new Map(products.map((p: any) => [p.id, p]));

  const items: ProductGridItem[] = [];
  for (const fav of favs) {
    const row = fav.product_id ? byId.get(fav.product_id) : null;
    if (!row) continue;

    const priceCentsCandidates = [
      row.effectivePriceCents,
      row.priceCents,
      row.basePriceCents,
    ].filter((v) => typeof v === "number" && Number.isFinite(v));
    const priceCents = priceCentsCandidates.length ? priceCentsCandidates[0] : null;
    const currency = (row.currency || "EUR").toUpperCase();
    const price = priceCents != null ? formatCurrency(priceCents / 100, currency) : null;
    const rating =
      typeof row.rating === "number" && Number.isFinite(row.rating) ? row.rating.toFixed(1) : null;
    const image =
      (typeof row.thumbnail === "string" && row.thumbnail.trim()) ||
      (typeof row.thumbnail_path === "string" && row.thumbnail_path.trim()) ||
      null;

    items.push({
      id: row.id,
      slug: row.slug ?? row.id,
      title: row.name ?? row.slug ?? "?????",
      price,
      meta: rating ? `? ${rating}` : null,
      image,
      availability: row.availability ?? null,
    });
  }

  return items;
}

export default async function FavoritesPage() {
  const items = await loadFavorites();

  return (
    <main className="mx-auto max-w-screen-xl space-y-10 px-6 py-10 sm:px-8 lg:px-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">?????????</h1>
        <p className="text-muted">
          ??????, ??????? ?? ???????? ?????????. ??????? ???????? ?????, ????? ???????.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/70 p-6 text-muted">
          ??? ????????? ???????.
        </div>
      ) : (
        <ProductGrid items={items} showAddToCart={true} gridId="favorites" />
      )}
    </main>
  );
}
