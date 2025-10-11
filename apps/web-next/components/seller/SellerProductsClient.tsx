"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { supabase } from "@shared/lib/supabase";

const SELLER_STATUS_LABELS = {
  active: "активен",
  pending: "на модерации",
  suspended: "заблокирован",
} as const;

type SellerProduct = {
  product_id: string;
  slug: string | null;
  title: string;
  status: string;
  price: number;
  currency: string;
  qty_available: number;
  created_at: string;
  updated_at: string;
};

type SellerProductsClientProps = {
  initialProducts: SellerProduct[];
  sellerStatus: string;
  defaultShowForm?: boolean;
};

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "EUR",
  }).format(Number(amount) || 0);
}

export default function SellerProductsClient({
  initialProducts,
  sellerStatus,
  defaultShowForm = false,
}: SellerProductsClientProps) {
  const [products, setProducts] = useState<SellerProduct[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(defaultShowForm);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [currency, setCurrency] = useState("EUR");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [images, setImages] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSellerActive = sellerStatus === "active";
  const sellerStatusLabel = useMemo(() => {
    const key = sellerStatus as keyof typeof SELLER_STATUS_LABELS;
    return SELLER_STATUS_LABELS[key] ?? sellerStatus;
  }, [sellerStatus]);

  async function refreshProducts() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_my_seller_products");
      if (rpcError) throw new Error(rpcError.message);
      if (Array.isArray(data)) {
        setProducts(data as SellerProduct[]);
      }
    } catch (err: any) {
      setError(err?.message ?? "Не удалось обновить список товаров");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSellerActive) {
      setError("Аккаунт продавца не активен, создание товаров недоступно.");
      return;
    }
    if (!title.trim()) {
      setError("Название товара обязательно.");
      return;
    }
    const normalizedSlug = slug.trim() ? normalizeSlug(slug) : normalizeSlug(title);
    if (!normalizedSlug) {
      setError("Slug обязателен. Используйте латиницу, цифры и дефис.");
      return;
    }
    const priceValue = typeof price === "string" ? Number(price) : price;
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setError("Цена должна быть положительным числом.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const imagesArray = images
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const { error: rpcError } = await supabase.rpc("create_product_as_seller", {
        p_slug: normalizedSlug,
        p_title: title.trim(),
        p_price: priceValue,
        p_currency: currency,
        p_status: status,
        p_images: imagesArray,
      });
      if (rpcError) throw new Error(rpcError.message);

      setTitle("");
      setSlug("");
      setPrice("");
      setCurrency("EUR");
      setStatus("draft");
      setImages("");
      setShowForm(false);
      setSuccessMessage("Товар создан. Можно наполнить описанием и опубликовать.");
      await refreshProducts();
    } catch (err: any) {
      setError(err?.message ?? "Не удалось создать товар");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 text-white">
      <header className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-neutral-900/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Мои товары</h1>
          <p className="text-sm text-white/60">
            Управляйте ассортиментом, обновляйте остатки и создавайте новые карточки.
          </p>
          {!isSellerActive ? (
            <p className="mt-2 text-xs text-amber-300">
              Статус продавца: {sellerStatusLabel}. Создание и публикация товаров недоступны до активации.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshProducts}
            className="inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Обновляем…" : "Обновить"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm((state) => !state)}
            className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/20 disabled:opacity-60"
            disabled={!isSellerActive}
          >
            {showForm ? "Отмена" : "Новый товар"}
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-100">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          {successMessage}
        </p>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-neutral-900/70 p-4 shadow-lg"
        >
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40">Название</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/15 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например, Premium Chips XXL"
              required
              maxLength={100}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40">Slug</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/15 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
                value={slug}
                onChange={(e) => setSlug(normalizeSlug(e.target.value))}
                placeholder="premium-chips-xxl"
              />
              <p className="mt-1 text-xs text-white/40">Оставьте пустым — slug создадим автоматически.</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40">Статус</label>
              <select
                className="mt-1 w-full rounded-lg border border-white/15 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "active")}
              >
                <option value="draft">Черновик</option>
                <option value="active">Активен</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40">Цена</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-lg border border-white/15 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
                value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40">Валюта</label>
              <select
                className="mt-1 w-full rounded-lg border border-white/15 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40">Изображения (по одному в строке)</label>
            <textarea
              className="mt-1 h-28 w-full rounded-lg border border-white/15 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
              value={images}
              onChange={(e) => setImages(e.target.value)}
              placeholder="https://cdn.example.com/products/123-front.jpg"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/20 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Сохраняем…" : "Создать товар"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
            >
              Отменить
            </button>
          </div>
        </form>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="border-b border-white/5 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/60">
          Список товаров
        </div>
        <div className="divide-y divide-white/5">
          {products.length === 0 ? (
            <div className="px-4 py-6 text-sm text-white/50">Товаров пока нет. Создайте первый!</div>
          ) : (
            products.map((product) => (
              <div
                key={product.product_id}
                className="grid gap-3 px-4 py-4 text-sm text-white/80 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-white">{product.title}</span>
                    {product.slug ? (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/50">
                        /{product.slug}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/50">
                    <span>
                      Цена:{" "}
                      <span className="text-white/80">
                        {formatCurrency(product.price ?? 0, product.currency ?? "EUR")}
                      </span>
                    </span>
                    <span>Остаток: {product.qty_available ?? 0}</span>
                    <span>Статус: {product.status}</span>
                    <span>Обновлено: {new Date(product.updated_at).toLocaleString("ru-RU")}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end text-xs">
                  <Link
                    href={`/products/${product.slug ?? product.product_id}`}
                    className="rounded-full border border-white/10 px-3 py-1 text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    Смотреть страницу
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
