"use client";


import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";
import { AdminStack, AdminSurface } from "@/components/admin/layout";
import {
  createEmptyProductTechSpecs,
  normalizeProductTechSpecs,
  sanitizeProductTechSpecs,
  type ProductTechSpecs,
} from "@/lib/catalog/product-tech-specs";
import ModelSpecsEditor from "./model-specs-editor";

import type { CatalogBrandRecord, CatalogProductRecord, CatalogProductStatus } from "../catalog-types";

type ApiListResponse<TItem> = {
  ok?: boolean;
  items?: TItem[];
  error?: string;
  message?: string;
};

type ApiMutationResponse<TItem> = {
  ok?: boolean;
  item?: TItem;
  deleted?: boolean;
  error?: string;
  message?: string;
};

type ProductFormState = {
  id: string | null;
  title: string;
  slug: string;
  brandId: string;
  description: string;
  price: string;
  currency: string;
  status: CatalogProductStatus;
  techSpecs: ProductTechSpecs;
};

type SkuSummary = {
  id: string;
  slug: string;
  title?: string | null;
  status?: string | null;
};

function createEmptyFormState(): ProductFormState {
  return {
    id: null,
    title: "",
    slug: "",
    brandId: "",
    description: "",
    price: "",
    currency: "USD",
    status: "draft",
    techSpecs: createEmptyProductTechSpecs(),
  };
}

const STATUS_OPTIONS: Array<{ value: CatalogProductStatus; label: string }> = [
  { value: "draft", label: "Черновик" },
  { value: "published", label: "Опубликовано" },
  { value: "archived", label: "Архив" },
];

const STATUS_LABELS = STATUS_OPTIONS.reduce<Record<CatalogProductStatus, string>>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<CatalogProductStatus, string>);

type StatusFilterValue = "all" | CatalogProductStatus;

const MODELS_PAGE_SIZE = 25;

function LoadingState({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <p className={`${compact ? "py-3" : "py-6"} flex items-center gap-2 text-sm text-admin-textSoft`}>
      <span
        className="h-3 w-3 animate-spin rounded-full border-2 border-admin-border border-t-transparent"
        aria-hidden="true"
      />
      {children}
    </p>
  );
}

function resolveStatus(value: string | null | undefined): CatalogProductStatus {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (STATUS_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : "draft") as CatalogProductStatus;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function fetchBrandOptions(): Promise<CatalogBrandRecord[]> {
  const response = await fetch("/api/admin/catalog/brands", {
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse<CatalogBrandRecord>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Не удалось загрузить бренды");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function fetchModels(filters: {
  brandId?: string;
  status?: StatusFilterValue;
  query?: string;
}): Promise<CatalogProductRecord[]> {
  const url = new URL("/api/admin/catalog/products", window.location.origin);
  if (filters.brandId) {
    url.searchParams.set("brand_id", filters.brandId);
  }
  if (filters.query) {
    url.searchParams.set("q", filters.query);
  }
  if (filters.status && filters.status !== "all") {
    url.searchParams.set("status", filters.status);
  }
  const response = await fetch(url.toString(), {
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse<CatalogProductRecord>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Не удалось загрузить модели");
  }
  const items = Array.isArray(payload.items) ? payload.items : [];
  return items.map((item) => ({
    ...item,
    specs: normalizeProductTechSpecs(item.specs ?? null),
  }));
}

async function saveModel(payload: Partial<CatalogProductRecord>) {
  const response = await fetch("/api/admin/catalog/products", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse<CatalogProductRecord>;
  if (!response.ok || !result.ok || !result.item) {
    throw new Error(result.message || result.error || "Не удалось сохранить модель");
  }
  return result.item;
}

async function archiveModel(id: string) {
  const response = await fetch("/api/admin/catalog/products", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse<CatalogProductRecord>;
  if (!response.ok || !result.ok) {
    throw new Error(result.message || result.error || "Не удалось удалить модель");
  }
  return result.item;
}

export function CatalogProductsClient() {
  const [brands, setBrands] = useState<CatalogBrandRecord[]>([]);
  const [models, setModels] = useState<CatalogProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandLoading, setBrandLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(() => createEmptyFormState());
  const [brandFilter, setBrandFilter] = useState<"all" | string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [skuList, setSkuList] = useState<SkuSummary[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [page, setPage] = useState(1);

  const brandById = useMemo(() => {
    const map = new Map<string, CatalogBrandRecord>();
    for (const brand of brands) {
      if (brand?.id) {
        map.set(brand.id, brand);
      }
    }
    return map;
  }, [brands]);

  const editMode = Boolean(form.id);

  const resetForm = useCallback(() => {
    setForm(createEmptyFormState());
  }, []);

  const loadBrands = useCallback(async () => {
    setBrandLoading(true);
    try {
      const data = await fetchBrandOptions();
      setBrands(data);
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Не удалось загрузить бренды.", { variant: "error" });
    } finally {
      setBrandLoading(false);
    }
  }, []);

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchModels({
        brandId: brandFilter === "all" ? undefined : brandFilter,
        status: statusFilter,
        query: search || undefined,
      });
      setModels(data);
      setPage(1);
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Не удалось загрузить модели.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [brandFilter, statusFilter, search]);

  useEffect(() => {
    loadBrands().catch(() => undefined);
  }, [loadBrands]);

  useEffect(() => {
    loadModels().catch(() => undefined);
  }, [loadModels]);

  const startEdit = (record: CatalogProductRecord) => {
    setForm({
      id: record.id,
      title: record.title,
      slug: record.slug,
      brandId: record.brand_id ?? "",
      description: record.description ?? "",
      price: record.price != null ? String(record.price) : "",
      currency: (record.currency ?? "USD").toUpperCase(),
      status: resolveStatus(record.status),
      techSpecs: normalizeProductTechSpecs(record.specs ?? null) ?? createEmptyProductTechSpecs(),
    });
    loadSkuList(record.id).catch(() => undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setBrandFilter("all");
    setStatusFilter("all");
    setSearchInput("");
    setSearch("");
  };

  const loadSkuList = useCallback(
    async (catalogProductId: string | null): Promise<SkuSummary[]> => {
      if (!catalogProductId) {
        setSkuList([]);
        return [];
      }
      setSkuLoading(true);
      try {
        const url = new URL("/api/ecom-products", window.location.origin);
        url.searchParams.set("catalog_product_id", catalogProductId);
        url.searchParams.set("limit", "200");
        const res = await fetch(url.toString(), { credentials: "include" });
        const payload = await res.json();
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const mapped: SkuSummary[] = items
          .map((item: any) => ({
            id: String(item?.id ?? ""),
            slug: typeof item?.slug === "string" ? item.slug : "",
            title: typeof item?.title === "string" ? item.title : typeof item?.name === "string" ? item.name : null,
            status: typeof item?.status === "string" ? item.status : null,
          }))
          .filter((x: SkuSummary) => x.id);
        setSkuList(mapped);
        return mapped;
      } catch (err) {
        console.error(err);
        setSkuList([]);
        return [];
      } finally {
        setSkuLoading(false);
      }
    },
    [],
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const title = form.title.trim();
    if (!title) {
      toast("Введите название модели.", { variant: "error" });
      return;
    }
    const brandId = form.brandId.trim();
    if (!brandId) {
      toast("Выберите бренд.", { variant: "error" });
      return;
    }
    const slug = form.slug.trim() || slugify(title);
    if (!slug) {
      toast("Введите слаг модели.", { variant: "error" });
      return;
    }
    const priceValue = form.price.trim();
    const parsedPrice = priceValue ? Number(priceValue) : null;
    if (priceValue && !Number.isFinite(parsedPrice)) {
      toast("Цена должна быть числом.", { variant: "error" });
      return;
    }
    if (!priceValue || parsedPrice == null || parsedPrice < 0) {
      toast("Укажите цену модели.", { variant: "error" });
      return;
    }
    const currency = form.currency.trim().toUpperCase();
    if (currency.length < 3 || currency.length > 8) {
      toast("Укажите валюту (например, USD или EUR).", { variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const normalizedSpecs = sanitizeProductTechSpecs(form.techSpecs);
      const payload = {
        id: form.id ?? undefined,
        title,
        slug,
        brand_id: brandId,
        description: form.description.trim() || null,
        price: parsedPrice,
        currency,
        status: form.status,
        specs: normalizedSpecs,
      } satisfies Partial<CatalogProductRecord>;
      const saved = await saveModel(payload);
      setModels((prev) => {
        const next = prev.filter((item) => item.id !== saved.id);
        next.push(saved);
        return next;
      });
      toast(editMode ? "Модель обновлена." : "Модель создана.", { variant: "success" });
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Не удалось сохранить модель.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (record: CatalogProductRecord) => {
    const list = await loadSkuList(record.id);
    const skuAttached = list.length > 0;
    if (skuAttached) {
      window.alert(`К этой модели привязано ${skuList.length} SKU. Сначала отвяжите или перенесите их.`);
      return;
    }
    const confirmed = window.confirm(`Архивировать модель «${record.title}»?`);
    if (!confirmed) return;
    setDeletingId(record.id);
    try {
      const updated = await archiveModel(record.id);
      setModels((prev) => {
        if (updated?.id) {
          return prev.map((item) => (item.id === updated.id ? updated : item));
        }
        return prev.filter((item) => item.id !== record.id);
      });
      toast("Модель архивирована.", { variant: "success" });
      if (form.id === record.id) {
        setForm((prev) => ({ ...prev, status: "archived" }));
      }
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Не удалось архивировать модель.", { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateSlug = () => {
    if (!form.title.trim()) return;
    setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
  };

  const appliedFiltersCount = useMemo(() => {
    let count = 0;
    if (brandFilter !== "all") count += 1;
    if (statusFilter !== "all") count += 1;
    if (search) count += 1;
    return count;
  }, [brandFilter, statusFilter, search]);

  const sortedModels = useMemo(() => {
    return [...models].sort((a, b) => {
      const dateA = a.created_at ? Date.parse(a.created_at) : 0;
      const dateB = b.created_at ? Date.parse(b.created_at) : 0;
      if (!Number.isFinite(dateA) && !Number.isFinite(dateB)) {
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      }
      return dateB - dateA;
    });
  }, [models]);

  const totalModels = sortedModels.length;
  const totalPages = Math.max(1, Math.ceil(totalModels / MODELS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedModels = useMemo(() => {
    const start = (currentPage - 1) * MODELS_PAGE_SIZE;
    return sortedModels.slice(start, start + MODELS_PAGE_SIZE);
  }, [sortedModels, currentPage]);

  const pageStartIndex = (currentPage - 1) * MODELS_PAGE_SIZE;
  const shownUpperBound = totalModels === 0 ? 0 : Math.min(totalModels, pageStartIndex + pagedModels.length);
  const paginationSummary =
    totalModels === 0 ? "Ничего не найдено" : `Показано ${shownUpperBound} из ${totalModels}`;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const goToPrevPage = () => setPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setPage((prev) => Math.min(totalPages, prev + 1));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Модель каталога</h2>
            <p className="text-sm text-admin-textSoft">
              {editMode ? "Редактирование существующей модели." : "Создайте новую модель каталога."}
            </p>
          </div>
          <Button variant="secondary" onClick={resetForm} disabled={saving}>
            Новая модель
          </Button>
        </div>
        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Название</label>
            <input
              type="text"
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  title: event.target.value,
                  slug: prev.id ? prev.slug : prev.slug || slugify(event.target.value),
                }))
              }
              placeholder="Например, SuperPhone 15"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Слаг</label>
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                className="flex-1 rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="superphone-15"
              />
              <Button type="button" variant="neutral" onClick={handleGenerateSlug}>
                Сгенерировать
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Бренд</label>
            <select
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={form.brandId}
              onChange={(event) => setForm((prev) => ({ ...prev, brandId: event.target.value }))}
              disabled={brandLoading}
            >
              <option value="">{brandLoading ? "Загрузка брендов..." : "Выберите бренд"}</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Описание</label>
            <textarea
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Дополнительное описание (необязательно)"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Цена</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="499"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Валюта</label>
              <input
                type="text"
                maxLength={8}
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                placeholder="USD"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Статус</label>
              <select
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as CatalogProductStatus }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ModelSpecsEditor
            value={form.techSpecs}
            onChange={(next) => setForm((prev) => ({ ...prev, techSpecs: next }))}
          />

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Сохранение..." : editMode ? "Сохранить изменения" : "Создать модель"}
            </Button>
            <Button type="button" variant="soft" onClick={resetForm} disabled={saving}>
              Отмена
            </Button>
          </div>

          {form.id ? (
            <div className="rounded-xl border border-admin-border bg-admin-surfaceMuted p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-admin-text">Связанные SKU</h3>
                  <p className="text-xs text-admin-textSubtle">
                    Показываем товары, привязанные к этой модели каталога.
                  </p>
                </div>
                <Button type="button" variant="neutral" onClick={() => loadSkuList(form.id)} disabled={skuLoading}>
                  {skuLoading ? "Обновляем..." : "Обновить"}
                </Button>
              </div>
              {skuLoading ? (
                <LoadingState compact>Загружаем связанные SKU...</LoadingState>
              ) : skuList.length === 0 ? (
                <p className="py-3 text-sm text-admin-textSubtle">Связанных SKU нет.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Slug</th>
                        <th className="px-3 py-2">Название</th>
                        <th className="px-3 py-2">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skuList.map((sku) => (
                        <tr key={sku.id} className="border-t border-admin-border">
                          <td className="px-3 py-2 font-mono text-xs text-admin-textSubtle">{sku.id}</td>
                          <td className="px-3 py-2 text-admin-text">{sku.slug || "—"}</td>
                          <td className="px-3 py-2 text-admin-text">{sku.title || "—"}</td>
                          <td className="px-3 py-2 text-admin-textSubtle">{sku.status || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </form>
      </AdminSurface>

      <AdminSurface>
        <div className="flex flex-col gap-4 border-b border-admin-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-admin-text">Модели</h2>
              <p className="text-sm text-admin-textSoft">
                Всего: {totalModels}
                {appliedFiltersCount ? ` · фильтров: ${appliedFiltersCount}` : ""}
              </p>
            </div>
            <Button variant="neutral" onClick={loadModels} disabled={loading}>
              Обновить
            </Button>
          </div>
          <form className="flex flex-col gap-3 lg:flex-row lg:items-end" onSubmit={handleSearchSubmit}>
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-textSoft">Бренд</label>
              <select
                className="mt-1 w-full rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text focus:border-admin-primary focus:outline-none"
                value={brandFilter}
                onChange={(event) => setBrandFilter(event.target.value || "all")}
              >
                <option value="all">Все бренды</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-textSoft">Статус</label>
              <select
                className="mt-1 w-full rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text focus:border-admin-primary focus:outline-none"
                value={statusFilter}
                onChange={(event) => setStatusFilter((event.target.value as StatusFilterValue) || "all")}
              >
                <option value="all">Все статусы</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-textSoft">Поиск</label>
              <input
                type="search"
                className="mt-1 w-full rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text focus:border-admin-primary focus:outline-none"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Название или slug"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit">Искать</Button>
              <Button type="button" variant="soft" onClick={handleClearFilters}>
                Сбросить
              </Button>
            </div>
          </form>
        </div>

        {loading ? (
          <LoadingState>Загружаем модели...</LoadingState>
        ) : totalModels === 0 ? (
          <p className="py-6 text-sm text-admin-textSoft">По выбранным фильтрам ничего не найдено.</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="mt-4 w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                    <th className="px-3 py-2">Название</th>
                    <th className="px-3 py-2">Slug</th>
                    <th className="px-3 py-2">Бренд</th>
                    <th className="px-3 py-2">Статус</th>
                    <th className="px-3 py-2">Создано</th>
                    <th className="px-3 py-2 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedModels.map((model) => {
                    const brand = model.brand_id ? brandById.get(model.brand_id) : null;
                    return (
                      <tr key={model.id} className="border-t border-admin-border">
                        <td className="px-3 py-3">
                          <div className="font-medium text-admin-text">{model.title}</div>
                          {model.description ? (
                            <div className="text-xs text-admin-textSoft">{model.description}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-admin-textSubtle">{model.slug}</td>
                        <td className="px-3 py-3 text-admin-textSubtle">{brand ? brand.name : "—"}</td>
                        <td className="px-3 py-3">
                          <span
                            className={clsx(
                              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                              model.status === "published" && "bg-emerald-100 text-emerald-700",
                              model.status === "draft" && "bg-sky-100 text-sky-700",
                              model.status === "archived" && "bg-slate-200 text-slate-600",
                            )}
                          >
                            {STATUS_LABELS[model.status as CatalogProductStatus] ?? model.status ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-admin-textSubtle">
                          {model.created_at ? new Date(model.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="neutral"
                              className="min-h-9 px-3 py-2 text-sm"
                              onClick={() => startEdit(model)}
                            >
                              Редактировать
                            </Button>
                            <Button
                              variant="soft"
                              className={clsx(
                                "min-h-9 px-3 py-2 text-sm text-rose-600",
                                deletingId === model.id && "opacity-60",
                              )}
                              disabled={deletingId === model.id}
                              onClick={() => handleArchive(model)}
                            >
                              {deletingId === model.id ? "Архивация..." : "Архивировать"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-border pt-4">
              <p className="text-sm text-admin-textSoft">{paginationSummary}</p>
              <div className="flex gap-2">
                <Button variant="soft" onClick={goToPrevPage} disabled={!canGoPrev}>
                  Назад
                </Button>
                <Button variant="secondary" onClick={goToNextPage} disabled={!canGoNext}>
                  Вперёд
                </Button>
              </div>
            </div>
          </div>
        )}
      </AdminSurface>
    </AdminStack>
  );
}
