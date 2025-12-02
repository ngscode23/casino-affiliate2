
"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
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
import type { CatalogBrandRecord, CatalogProductRecord } from "../../catalog/catalog-types";

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

function normalizePriceInput(raw: string): string {
  if (!raw) return "";
  const filtered = raw.replace(/[^0-9.,]/g, "");
  const firstSeparator = filtered.search(/[.,]/);
  if (firstSeparator === -1) {
    return filtered;
  }
  const separator = filtered[firstSeparator];
  const integerPart = filtered.slice(0, firstSeparator);
  const decimals = filtered.slice(firstSeparator + 1).replace(/[.,]/g, "");
  return `${integerPart}${separator}${decimals}`;
}

function resolveLoadedTitle(record: Record<string, unknown> | null): string {
  if (!record) return "";
  const titleValue = typeof record.title === "string" ? record.title.trim() : "";
  if (titleValue) return titleValue;
  return typeof record.name === "string" ? record.name.trim() : "";
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
  catalogBrandId: string;
  catalogProductId: string;
}) {
  return JSON.stringify({
    ...state,
    images: [...state.images],
  });
}

type CatalogApiListResponse<T> = {
  ok?: boolean;
  items?: T[];
  error?: string;
  message?: string;
};

function constraintHint(message: string): string | null {
  const normalized = (message || "").toLowerCase();
  if (normalized.includes("ecom_products_catalog_product_fk") || normalized.includes("catalog_product_id")) {
    return "Выбранная модель каталога не найдена или удалена. Обновите выбор модели и попробуйте снова.";
  }
  if (normalized.includes("ecom_products_category_slug_fk") || normalized.includes("category_slug")) {
    return "Категория больше не существует. Выберите актуальную категорию и повторите сохранение.";
  }
  return null;
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

  const [catalogBrands, setCatalogBrands] = useState<CatalogBrandRecord[]>([]);
  const [catalogModels, setCatalogModels] = useState<CatalogProductRecord[]>([]);
  const [catalogBrandId, setCatalogBrandId] = useState("");
  const [catalogProductId, setCatalogProductId] = useState("");
  const [catalogBrandsLoading, setCatalogBrandsLoading] = useState(false);
  const [catalogModelsLoading, setCatalogModelsLoading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [originalSnapshot, setOriginalSnapshot] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const selectedBrand = useMemo(
    () => catalogBrands.find((brand) => brand.id === catalogBrandId) ?? null,
    [catalogBrands, catalogBrandId],
  );
  const selectedModel = useMemo(
    () => catalogModels.find((model) => model.id === catalogProductId) ?? null,
    [catalogModels, catalogProductId],
  );
  const catalogPublishBlockedReason = useMemo(() => {
    const brandStatus = selectedBrand?.status?.toLowerCase();
    const modelStatus = selectedModel?.status?.toLowerCase();
    const brandInactive =
      brandStatus === "archived" ||
      brandStatus === "inactive" ||
      brandStatus === "disabled" ||
      selectedBrand?.is_active === false;
    const modelInactive = modelStatus === "archived";
    if (modelInactive) return "Модель в архиве: публикация SKU недоступна.";
    if (brandInactive) return "Бренд неактивен: публикация SKU недоступна.";
    return null;
  }, [selectedBrand, selectedModel]);

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

        // preload brands
        const brandsUrl =
          origin && typeof window !== "undefined"
            ? new URL("/api/admin/catalog/brands", origin).toString()
            : "/api/admin/catalog/brands";
        try {
          setCatalogBrandsLoading(true);
          const brandRes = await authorizedFetch(brandsUrl, { cache: "no-store" });
          const brandPayload = (await brandRes.json().catch(() => ({}))) as CatalogApiListResponse<CatalogBrandRecord>;
          if (brandRes.ok && brandPayload?.ok && Array.isArray(brandPayload.items)) {
            setCatalogBrands(brandPayload.items);
          }
        } finally {
          setCatalogBrandsLoading(false);
        }

        if (!currentId) {
          setCatalogBrandId("");
          setCatalogProductId("");
          setCatalogModels([]);
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
          const nextTitle = resolveLoadedTitle(product);
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
          setPrice(normalizePriceInput(nextPrice));
          setCategory(nextCategory);
          setStatus(nextStatus);
          setRating(nextRating);
          setShortDesc(nextShortDesc);
          setTags(nextTags);
          setImages(nextImages);
          setSpecsJson(specsJsonString);

          // resolve catalog product / brand
          let resolvedBrandId = "";
          let resolvedCatalogId = "";
          const catalogId =
            product.catalog_product_id != null && String(product.catalog_product_id).trim()
              ? String(product.catalog_product_id).trim()
              : "";
          setCatalogProductId(catalogId);
          if (catalogId) {
            try {
              const catalogUrl =
                origin && typeof window !== "undefined"
                  ? new URL("/api/admin/catalog/products", origin).toString()
                  : "/api/admin/catalog/products";
              const catalogRes = await authorizedFetch(`${catalogUrl}?id=${catalogId}&status=all`, { cache: "no-store" });
              const catalogPayload = (await catalogRes.json().catch(() => ({}))) as CatalogApiListResponse<CatalogProductRecord>;
              const record = Array.isArray(catalogPayload?.items) ? catalogPayload.items[0] : null;
              if (record?.brand_id) {
                resolvedBrandId = String(record.brand_id);
                resolvedCatalogId = String(record.id);
                setCatalogBrandId(resolvedBrandId);
                setCatalogProductId(resolvedCatalogId || catalogId);
              }
            } catch {
              // ignore, we still allow manual re-selection
            }
          }

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
            catalogBrandId: resolvedBrandId,
            catalogProductId: resolvedCatalogId,
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
      catalogBrandId,
      catalogProductId,
    });
    setIsDirty(originalSnapshot !== null && snapshot !== originalSnapshot);
  }, [
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
    specsJson,
    catalogBrandId,
    catalogProductId,
    originalSnapshot,
  ]);

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

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value || null;
    setCategory(value);
    setCatalogBrandId("");
    setCatalogProductId("");
    setCatalogModels([]);
  };

  const handleCatalogBrandChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;
    setCatalogBrandId(value);
    setCatalogProductId("");
  };

  const handleCatalogProductChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCatalogProductId(event.currentTarget.value);
  };

  const fetchCatalogModelsByBrand = useCallback(
    async (brandId: string): Promise<CatalogProductRecord[]> => {
      if (!brandId) return [];
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = origin ? new URL("/api/admin/catalog/products", origin) : new URL("/api/admin/catalog/products", "http://localhost");
      url.searchParams.set("brand_id", brandId);
      url.searchParams.set("status", "all");
      const res = await authorizedFetch(url.toString(), { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as CatalogApiListResponse<CatalogProductRecord>;
      if (!res.ok || !payload?.ok) {
        const message = payload?.message || payload?.error || "Не удалось загрузить модели";
        throw new Error(message);
      }
      return Array.isArray(payload.items) ? payload.items : [];
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    if (!catalogBrandId) {
      setCatalogModels([]);
      setCatalogProductId("");
      return;
    }
    setCatalogModelsLoading(true);
    fetchCatalogModelsByBrand(catalogBrandId)
      .then((items) => {
        if (cancelled) return;
        setCatalogModels(items);
        if (items.every((m) => m.id !== catalogProductId)) {
          setCatalogProductId("");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        toast(err instanceof Error ? err.message : "Не удалось загрузить модели", { variant: "error" });
        setCatalogModels([]);
        setCatalogProductId("");
      })
      .finally(() => {
        if (!cancelled) setCatalogModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogBrandId, catalogProductId, fetchCatalogModelsByBrand]);

  const handlePriceChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
  setPrice(normalizePriceInput(event.currentTarget.value));
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

      if (!category) {
        throw new Error("Выберите категорию каталога");
      }
      if (!catalogBrandId) {
        throw new Error("Выберите бренд каталога");
      }
      if (!catalogProductId) {
        throw new Error("Выберите модель каталога");
      }
      const modelRecord = catalogModels.find((model) => model.id === catalogProductId);
      if (modelRecord?.brand_id && String(modelRecord.brand_id) !== String(catalogBrandId)) {
        throw new Error("Выбранная модель принадлежит другому бренду. Проверьте связку.");
      }
      if (status === "published" && catalogPublishBlockedReason) {
        throw new Error(catalogPublishBlockedReason);
      }

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
        catalog_product_id: catalogProductId,
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
        const rawText = await response.text();
        const friendly = constraintHint(rawText);
        throw new Error(friendly ?? rawText ?? "Не удалось сохранить товар");
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
        catalogBrandId,
        catalogProductId,
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
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Новые бренды и модели добавляются в разделе <strong>Catalog → Brands / Products</strong>. Здесь вы только привязываете SKU к готовым моделям.
                </div>

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
                      type="text"
                      inputMode="decimal"
                      value={price}
                      onChange={handlePriceChange}
                      placeholder="0"
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
                      onChange={handleCategoryChange}
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
                      <option value="published" disabled={Boolean(catalogPublishBlockedReason)}>
                        Опубликован
                      </option>
                      <option value="archived">Архив</option>
                    </select>
                    {catalogPublishBlockedReason ? (
                      <p className="text-xs text-amber-600">{catalogPublishBlockedReason}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Бренд каталога</label>
                    <select
                      className="h-10 w-full rounded-md border border-admin-border bg-admin-surface px-3 text-sm"
                      value={catalogBrandId}
                      onChange={handleCatalogBrandChange}
                      disabled={catalogBrandsLoading || catalogBrands.length === 0}
                    >
                      <option value="">{catalogBrandsLoading ? "Загрузка..." : "Не выбран"}</option>
                      {catalogBrands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                          {brand.status && brand.status !== "published" ? ` (${brand.status})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-admin-text">Модель каталога</label>
                    <select
                      className="h-10 w-full rounded-md border border-admin-border bg-admin-surface px-3 text-sm"
                      value={catalogProductId}
                      onChange={handleCatalogProductChange}
                      disabled={!catalogBrandId || catalogModelsLoading || catalogModels.length === 0}
                    >
                      <option value="">
                        {catalogBrandId ? (catalogModelsLoading ? "Загрузка..." : "Не выбрана") : "Сначала выберите бренд"}
                      </option>
                      {catalogModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.title}
                          {model.status && model.status !== "published" ? ` (${model.status})` : ""}
                        </option>
                      ))}
                    </select>
                    {selectedModel ? (
                      <div className="rounded-lg border border-admin-border bg-admin-surfaceMuted px-3 py-2 text-xs text-admin-text">
                        <div className="flex items-center justify-between gap-3">
                          <span>
                            Бренд: {selectedBrand?.name ?? "—"} ({selectedBrand?.slug ?? "—"})
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold capitalize ${
                              selectedModel.status === "published"
                                ? "bg-emerald-100 text-emerald-700"
                                : selectedModel.status === "archived"
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {selectedModel.status ?? "unknown"}
                          </span>
                        </div>
                        {catalogPublishBlockedReason ? (
                          <p className="mt-1 text-[11px] text-amber-700">{catalogPublishBlockedReason}</p>
                        ) : null}
                      </div>
                    ) : null}
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
