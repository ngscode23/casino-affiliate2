import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { type ProductGridItem } from "@/components/ProductGrid";
import { HydratedProductGrid } from "@/components/ProductGrid/HydratedProductGrid";
import { formatCurrency } from "@/app/products/currency";
import { normalizeImageUrl } from "@/app/products/[slug]/data";
import { mapDbProduct, type DbProductRow } from "@/lib/catalog/mapDbProduct";

export const metadata: Metadata = {
  title: "Избранное | Личный кабинет",
  alternates: { canonical: "/account/favorites" },
};

async function loadFavorites(): Promise<ProductGridItem[]> {
  // 1) Определяем текущего пользователя через обычный (cookie-aware) Supabase клиент
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    redirect("/login");
  }

  // 2) Читаем данные через админ-клиент (service_role), чтобы обойти ограничения
  //    на view product_with_discount_with_dataset, но фильтруем по user_id вручную.
  const admin = getAdminClient();

  const { data: favs, error: favError } = await admin
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
  const { data: products, error: prodError } = await admin
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

    const product = mapDbProduct(row as DbProductRow);
    const price =
      product.priceCents != null ? formatCurrency(product.priceCents / 100, product.currency) : null;
    const rating =
      typeof product.rating === "number" && Number.isFinite(product.rating) ? product.rating.toFixed(1) : null;
    const image = product.mainImage ?? normalizeImageUrl(product.thumbnailPath) ?? null;

    items.push({
      id: product.id,
      slug: product.slug ?? product.id,
      title: product.title ?? product.slug ?? "Избранный товар",
      price,
      meta: rating ? `? ${rating}` : null,
      image,
      availability: product.availability ?? null,
    });
  }

  return items;
}

export default async function FavoritesPage() {
  const items = await loadFavorites();

  return (
    <main className="mx-auto max-w-screen-xl space-y-10 px-6 py-10 sm:px-8 lg:px-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">Избранное</h1>
        <p className="text-muted">
           Товары, которые вы добавили в избранное. Быстрый доступ к предложениям, которые вас заинтересовали.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/70 p-6 text-muted">
          У вас пока нет избранных товаров.
        </div>
      ) : (
        <HydratedProductGrid items={items} showAddToCart />
      )}
    </main>
  );
}
