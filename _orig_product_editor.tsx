
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";
import { getValidAccessToken } from "@shared/lib/auth";
import { adminFetch } from "@shared/lib/api";
import { normalizeSku, slugifyTitle } from "@shared/lib/normalize";
import {
  AdminContentWrapper,
  AdminInfoPanel,
  AdminPageLayout,
  AdminStack,
  AdminSurface,
} from "@/components/admin/layout";

import { ProductImagesField } from "./product-images-field";
import { ProductImageHistory } from "./product-image-history";

interface Category {
  slug: string;
  name: string;
  title?: string;
  description?: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
}

interface EditorProps {
  productId?: string | null;
}

async function authorizedFetch(input: string, init?: RequestInit) {
  const accessToken = await getValidAccessToken().catch(() => null);
  const headers = new Headers(init?.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return adminFetch(input, { ...init, headers });
}

function generateSku() {
  const base = "SKU";
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase();
  return `${base}-${stamp}-${random}`;
}

function snapshotState(state: {
  title: string;
  slug: string;
  sku: string;
  price: string;
  category: string | null;
  status: string;
  rating: string;
  shortDesc: string;
  tags: string;
  images: string[];
  specs: Record<string, unknown>;
}) {
  return JSON.stringify({
    ...state,
    images: [...state.images],
  });
}

export function ProductEditorClient({ productId }: EditorProps) {
  const router = useRouter();
  const [currentId, setCurrentId] = useState<string | null>(productId ?? null);

  const isNew = !currentId;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [rating, setRating] = useState("0");
  const [shortDesc, setShortDesc] = useState("");
  const [sku, setSku] = useState("");
  const [tags, setTags] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [specsJson, setSpecsJson] = useState("{}");
  const [specsError, setSpecsError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [originalSnapshot, setOriginalSnapshot] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setCurrentId(productId ?? null);
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const categoriesUrl = origin
          ? new URL("/api/ecom-categories", origin).toString()
          : "/api/ecom-categories";
        const categoriesResponse = await authorizedFetch(categoriesUrl, { cache: "no-store" });
        if (!categoriesResponse.ok) {
          throw new Error(await categoriesResponse.text());
        }
        const categoriesJson = await categoriesResponse.json();
        if (!cancelled && Array.isArray(categoriesJson?.items)) {
          setCategories(categoriesJson.items as Category[]);
        }

        if (!currentId) {
          setOriginalSnapshot(null);
          setIsDirty(false);
          setLoading(false);
          return;
        }

        const productsUrl = origin
          ? new URL("/api/ecom-products", origin)
          : new URL("/api/ecom-products", "http://localhost");
        productsUrl.searchParams.set("ids", currentId);
        productsUrl.searchParams.set("limit", "1");

        const productResponse = await authorizedFetch(productsUrl.toString(), { cache: "no-store" });
        if (!productResponse.ok) {
          throw new Error(await productResponse.text());
        }
        const productJson = await productResponse.json();
        const product =
          Array.isArray(productJson?.items) && productJson.items.length
            ? (productJson.items[0] as Record<string, any>)
            : null;

        if (product && !cancelled) {
          const nextTitle = String(product.title ?? "");
          const nextSlug = String(product.slug ?? "");
          const nextSku = product.sku != null ? String(product.sku) : "";
          const nextPrice = product.price != null ? String(product.price) : "0";
          const nextCategory = product.category_slug != null ? String(product.category_slug) : null;
          const rawStatus = typeof product.status === "string" ? product.status : "draft";
          const nextStatus =
            rawStatus === "published" || rawStatus === "archived" ? rawStatus : "draft";
          const nextRating = product.rating != null ? String(product.rating) : "0";
          const nextShortDesc = product.short_desc != null ? String(product.short_desc) : "";
          const nextTags = Array.isArray(product.tags)
            ? (product.tags as (string | null | undefined)[])
                .map((value) => (value ? String(value) : ""))
                .filter(Boolean)
                .join(", ")
            : "";
          const nextImages = Array.isArray(product.images)
            ? (product.images as (string | null | undefined)[])
                .map((value) => (value ? String(value) : ""))
                .filter(Boolean)
            : [];
          const nextSpecsObject =
            product.specs && typeof product.specs === "object"
              ? (product.specs as Record<string, unknown>)
              : {};

          let specsJsonString = "{}";
          try {
            specsJsonString = JSON.stringify(nextSpecsObject, null, 2);
            setSpecsError(null);
          } catch (err) {
            console.warn("Failed to stringify specs", err);
          }

          setTitle(nextTitle);
          setSlug(nextSlug);
          setSku(nextSku);
          setPrice(nextPrice);
          setCategory(nextCategory);
          setStatus(nextStatus);
          setRating(nextRating);
          setShortDesc(nextShortDesc);
          setTags(nextTags);
          setImages(nextImages);
          setSpecsJson(specsJsonString);

          const snapshot = snapshotState({
            title: nextTitle,
            slug: nextSlug,
            sku: nextSku,
            price: nextPrice,
            category: nextCategory,
            status: nextStatus,
            rating: nextRating,
            shortDesc: nextShortDesc,
            tags: nextTags,
            images: nextImages,
            specs: nextSpecsObject,
          });
          setOriginalSnapshot(snapshot);
          setIsDirty(false);
        } else if (!cancelled) {
          setError("Product not found");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentId]);

  useEffect(() => {
    if (!isNew) return;
    if (!title) return;
    setSlug((prev) => (prev ? prev : slugifyTitle(title, sku)));
    setSku((prev) => (prev ? prev : normalizeSku(undefined, title)));
  }, [title, sku, isNew]);

  useEffect(() => {
    let specsObject: Record<string, unknown> = {};
    try {
      specsObject = JSON.parse(specsJson || "{}");
      setSpecsError(null);
    } catch {
      specsObject = {};
    }

    const snapshot = snapshotState({
      title,
      slug,
      sku,
      price,
      category,
      status,
      rating,
      shortDesc,
      tags,
      images,
      specs: specsObject,
    });
    setIsDirty(originalSnapshot !== null && snapshot !== originalSnapshot);
  }, [title, slug, sku, price, category, status, rating, shortDesc, tags, images, specsJson, originalSnapshot]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  const categoryOptions = useMemo(() => {
    return [{ slug: "", name: "Не выбрана" }, ...categories];
  }, [categories]);

  const handleUseImage = useCallback((url: string) => {
    setImages((prev) => [url, ...prev.filter((item) => item !== url)]);
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSpecsError(null);

      const normalizedSku = normalizeSku(sku, title);
      const normalizedSlug = slugifyTitle(slug || title, normalizedSku);
      const priceValue = parseFloat(price.replace(",", "."));
      if (!Number.isFinite(priceValue)) {
        throw new Error("Цена должна быть числом");
      }
      const ratingValue = parseFloat(rating.replace(",", "."));

      let specsData: Record<string, unknown> = {};
      try {
        specsData = specsJson.trim() ? (JSON.parse(specsJson) as Record<string, unknown>) : {};
      } catch (specError) {
        setSpecsError("Поле должно содержать корректный JSON");
        throw specError;
      }

      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        id: currentId ?? undefined,
        title: title.trim(),
        slug: normalizedSlug,
        sku: normalizedSku,
        price: priceValue,
        rating: Number.isFinite(ratingValue) ? ratingValue : null,
        category_slug: category || null,
        status,
        short_desc: shortDesc.trim(),
        tags: tagsArray,
        images,
        specs: specsData,
      };

      const accessToken = await getValidAccessToken().catch(() => null);

      const headers = new Headers({
        "content-type": "application/json",
      });
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

      const response = await adminFetch("/api/admin-products", {
        method: "POST",
        headers,
        body: JSON.stringify({ op: "upsert", product: payload }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const json = await response.json();
      if (json?.ok === false) {
        throw new Error(String(json?.message || json?.error || "Не удалось сохранить товар"));
      }

      const nextId = (json?.id as string | undefined) ?? currentId;
      toast("Сохранено", { variant: "success" });

      const snapshot = snapshotState({
        title: payload.title as string,
        slug: normalizedSlug,
        sku: normalizedSku,
        price: String(priceValue),
        category: category || null,
        status,
        rating: Number.isFinite(ratingValue) ? String(ratingValue) : "0",
        shortDesc: payload.short_desc as string,
        tags: tagsArray.join(", "),
        images,
        specs: specsData,
      });
      setOriginalSnapshot(snapshot);
      setIsDirty(false);

      if (!currentId && nextId) {
        setCurrentId(nextId);
        setHistoryRefresh((value) => value + 1);
        router.replace(`/admin/shop/products/${nextId}`);
      } else if (currentId) {
        setHistoryRefresh((value) => value + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const formId = "admin-product-editor-form";
  const pageTitle = isNew ? "Новый товар" : "Редактирование товара";
  const pageDescription = isNew
    ? "Заполните карточку и опубликуйте товар в каталоге."
    : "Обновите контент, цены и статус публикации.";
  const statusMessage = loading
    ? "Загрузка данных..."
    : saving
      ? "Сохраняем изменения..."
      : isDirty
        ? "Есть несохранённые изменения"
        : "Все изменения сохранены";
  const breadcrumbs = useMemo(
    () => [
      { label: "Админка", href: "/admin" },
      { label: "Товары", href: "/admin/shop/products" },
      { label: isNew ? "Новый товар" : title || "Редактирование" },
    ],
    [isNew, title],
  );

  return (
    <AdminContentWrapper>
      <AdminPageLayout
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={breadcrumbs}
        primaryActions={
          <Button type="submit" form={formId} disabled={saving || loading}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </Button>
        }
        secondaryActions={
          <Button
            type="button"
            variant="soft"
            disabled={saving}
            onClick={() => router.push("/admin/shop/products")}
          >
            К списку товаров
          </Button>
        }
        sidebar={
          <AdminStack gap="lg">
            <AdminInfoPanel title="Статус карточки">
              <div className="space-y-2">
                <p>{statusMessage}</p>
                <p className="text-xs text-admin-textSubtle">
                  {currentId
                    ? `ID: ${currentId}`
                    : "Карточка появится после первого сохранения."}
                </p>
              </div>
            </AdminInfoPanel>
            <AdminInfoPanel title="Подсказка">
              <div className="space-y-2 text-sm">
                <p>Заполните обязательные поля. После сохранения станет доступна история изображений.</p>
                <p>Статус «Опубликован» сделает товар видимым в каталоге.</p>
              </div>
            </AdminInfoPanel>
          </AdminStack>
        }
      >
        <AdminSurface padded="lg">
          {loading ? (
            <AdminStack gap="lg">
              <div className="space-y-3">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-[320px] w-full" />
              </div>
            </AdminStack>
          ) : (
            <form id={formId} className="space-y-6" onSubmit={handleSave}>
              <AdminStack gap="lg">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Название</label>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.currentTarget.value)}
                      placeholder="Например, Премиум-рулетка"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Слаг</label>
                    <Input
                      value={slug}
                      onChange={(event) => setSlug(event.currentTarget.value)}
                      placeholder="premium-ruletka"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Цена</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(event) => setPrice(event.currentTarget.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Рейтинг</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={rating}
                      onChange={(event) => setRating(event.currentTarget.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Артикул (SKU)</label>
                    <div className="flex gap-2">
                      <Input
                        value={sku}
                        onChange={(event) => setSku(event.currentTarget.value)}
                        required
                      />
                      <Button type="button" variant="soft" onClick={() => setSku(generateSku())}>
                        Сгенерировать
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Категория</label>
                    <select
                      className="h-10 w-full rounded-md border border-admin-border bg-admin-surface px-3 text-sm"
                      value={category ?? ""}
                      onChange={(event) => setCategory(event.currentTarget.value || null)}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.slug || "none"} value={option.slug}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Статус</label>
                    <select
                      className="h-10 w-full rounded-md border border-admin-border bg-admin-surface px-3 text-sm"
                      value={status}
                      onChange={(event) => setStatus(event.currentTarget.value)}
                    >
                      <option value="draft">Черновик</option>
                      <option value="published">Опубликован</option>
                      <option value="archived">Архив</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-admin-text">Краткое описание</label>
                  <textarea
                    value={shortDesc}
                    onChange={(event) => setShortDesc(event.currentTarget.value)}
                    rows={3}
                    className="w-full resize-y rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-sm"
                    placeholder="Ключевые преимущества товара в двух-трёх предложениях"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-admin-text">Теги (через запятую)</label>
                  <Input
                    value={tags}
                    onChange={(event) => setTags(event.currentTarget.value)}
                    placeholder="casino, premium, roulette"
                  />
                </div>

                <ProductImagesField
                  label="Изображения"
                  images={images}
                  onChange={setImages}
                  productId={currentId}
                  slug={slug}
                  sku={sku}
                  onVersionCreated={() => setHistoryRefresh((value) => value + 1)}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-admin-text">Характеристики (JSON)</label>
                  <textarea
                    value={specsJson}
                    onChange={(event) => setSpecsJson(event.currentTarget.value)}
                    rows={6}
                    className="w-full resize-y rounded-md border border-admin-border bg-admin-surface px-3 py-2 font-mono text-xs"
                    placeholder='{"volatility": "low", "minBet": 1.5}'
                  />
                  {specsError ? <p className="text-xs text-rose-500">{specsError}</p> : null}
                </div>

                {error ? <p className="text-sm text-rose-500">{error}</p> : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Сохраняем..." : "Сохранить"}
                  </Button>
                  <Button
                    type="button"
                    variant="soft"
                    onClick={() => router.push("/admin/shop/products")}
                  >
                    К списку товаров
                  </Button>
                </div>
              </AdminStack>
            </form>
          )}
        </AdminSurface>

        {!loading && currentId ? (
          <AdminSurface tone="muted" padded="lg">
            <AdminStack gap="md">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-admin-text">История изображений</h2>
                <p className="text-sm text-admin-textSoft">
                  Используйте прошлые версии или удалите лишние варианты.
                </p>
              </div>
              <ProductImageHistory
                productId={currentId}
                refreshToken={historyRefresh}
                onUseImage={handleUseImage}
              />
            </AdminStack>
          </AdminSurface>
        ) : null}
      </AdminPageLayout>
    </AdminContentWrapper>
  );
}
