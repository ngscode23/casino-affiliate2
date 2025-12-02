"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns3, Download, Filter, MoreHorizontal, Save, Search, Tag, Upload } from "lucide-react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import Skeleton from "@ui/components/common/skeleton";
import StatusBadge from "@ui/components/admin/StatusBadge";
import ProductDialog from "@ui/components/admin/ProductDialog";
import { toast } from "@ui/components/common/toast";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/components/common/dropdown-menu";
import { adminFetch } from "@shared/lib/api";
import { getValidAccessToken } from "@shared/lib/auth";
import { sanitizeSearchParam } from "@shared/lib/sanitize";

import {
  AdminContentWrapper,
  AdminInfoPanel,
  AdminPageLayout,
  AdminStack,
  AdminSurface,
} from "@/components/admin/layout";

interface ProductRow {
  id: string;
  title?: string | null;
  name?: string | null;
  slug: string;
  price?: number | null;
  priceCents?: number | null;
  basePriceCents?: number | null;
  effectivePriceCents?: number | null;
  price_cents?: number | string | null;
  base_price_cents?: number | string | null;
  effective_price_cents?: number | string | null;
  currency?: string | null;
  category_slug: string | null;
  status: string | null;
  rating: number | null;
  created_at: string;
  sku?: string | null;
  images?: string[] | null;
  short_desc?: string | null;
  tags?: string[] | null;
}

interface CategoryOption {
  slug: string;
  name: string;
  title?: string;
  description?: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
  color?: string | null;
}

interface FetchParams {
  q?: string;
  status?: string;
  category?: string;
  sort?: string;
  dir?: "asc" | "desc";
  limit?: number;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveProductName(row?: Pick<ProductRow, "title" | "name"> | null): string {
  if (!row) return "";
  return normalizeText(row.title) || normalizeText(row.name) || "";
}

function parseCentsValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolvePriceValue(row?: ProductRow | null): number | null {
  if (!row) return null;
  if (typeof row.price === "number" && Number.isFinite(row.price)) {
    return Math.max(row.price, 0);
  }
  const centsCandidates: Array<unknown> = [
    row.effectivePriceCents,
    row.priceCents,
    row.basePriceCents,
    row.price_cents,
    row.effective_price_cents,
    row.base_price_cents,
  ];
  for (const candidate of centsCandidates) {
    const cents = parseCentsValue(candidate);
    if (cents != null) {
      return Math.max(cents, 0) / 100;
    }
  }
  return null;
}

async function authorizedFetch(input: string, init?: RequestInit) {
  const accessToken = await getValidAccessToken().catch(() => null);
  const headers = new Headers(init?.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return adminFetch(input, { ...init, headers });
}

async function fetchProducts(params: FetchParams) {
  const url = new URL("/api/ecom-products", window.location.origin);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.status && params.status !== "all") {
    url.searchParams.set("status", params.status);
  }
  if (params.category && params.category !== "all") {
    url.searchParams.set("category", params.category);
  }
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.dir) url.searchParams.set("dir", params.dir);
  url.searchParams.set("limit", String(params.limit ?? 25));

  const res = await authorizedFetch(url.toString());
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const json = await res.json();
  return {
    items: Array.isArray(json?.items) ? (json.items as ProductRow[]) : [],
    total: Number(json?.total || 0),
  };
}

async function fetchCategories() {
  try {
    const res = await authorizedFetch("/api/ecom-categories");
    if (!res.ok) return [] as CategoryOption[];
    const json = await res.json();
    return Array.isArray(json?.items) ? (json.items as CategoryOption[]) : [];
  } catch (error) {
    console.warn("Failed to load categories", error);
    return [];
  }
}

type AdminProductsResponse = {
  ok?: boolean;
  error?: string;
  deleted?: number;
  archived?: number;
  duplicated?: number;
};

function parseAdminResponse(raw: string): AdminProductsResponse | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as AdminProductsResponse;
    }
  } catch {
    // ignore malformed payloads; caller will fallback to raw response text
  }
  return null;
}

const CATEGORY_PALETTES = [
  "bg-[#60a5fa]",
  "bg-[#f97316]",
  "bg-[#34d399]",
  "bg-[#a855f7]",
  "bg-[#facc15]",
  "bg-[#f472b6]",
  "bg-[#38bdf8]",
  "bg-[#fb7185]",
];

function pickCategoryDot(slug: string | null) {
  const base = slug ?? "";
  if (!base.length) return "bg-border";
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = base.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % CATEGORY_PALETTES.length;
  return CATEGORY_PALETTES[idx];
}

type SavedView = {
  id: string;
  name: string;
  filters: {
    q?: string;
    status?: string;
    category?: string;
    sort?: string;
    dir?: "asc" | "desc";
  };
};

const DEFAULT_VIEWS: SavedView[] = [
  { id: "default", name: "Все товары", filters: {} },
  { id: "drafts", name: "Черновики", filters: { status: "draft" } },
  { id: "hidden", name: "Архив", filters: { status: "archived" } },
];

const PRODUCT_COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "price", label: "Цена" },
  { key: "category", label: "Категория" },
  { key: "status", label: "Статус" },
  { key: "rating", label: "Рейтинг" },
  { key: "created_at", label: "Создан" },
] as const;

type ProductColumnKey = (typeof PRODUCT_COLUMNS)[number]["key"];

function filtersMatch(a: SavedView["filters"], b: SavedView["filters"]): boolean {
  return (
    (a.q ?? undefined) === (b.q ?? undefined) &&
    (a.status ?? "all") === (b.status ?? "all") &&
    (a.category ?? "all") === (b.category ?? "all") &&
    (a.sort ?? "created_at") === (b.sort ?? "created_at") &&
    (a.dir ?? "desc") === (b.dir ?? "desc")
  );
}

function formatCurrency(value: number | null | undefined) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return value != null ? String(value) : "-";
  }
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function ProductsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [query, setQuery] = useState(() => sanitizeSearchParam(searchParams?.get("q")));
  const [status, setStatus] = useState(() => searchParams?.get("status") ?? "all");
  const [category, setCategory] = useState(() => searchParams?.get("category") ?? "all");
  const [items, setItems] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [pageSize, setPageSize] = useState(25);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState(() => new Set<ProductColumnKey>(["price", "status", "category", "created_at"]));
  const [savedViews, setSavedViews] = useState<SavedView[]>(DEFAULT_VIEWS);
  const [activeViewId, setActiveViewId] = useState<string>("default");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const normalizedCategories = useMemo(
    () => categories.map((item) => ({ ...item, color: item.color ?? undefined })),
    [categories],
  );

  const currentFilters = useMemo(
    () => ({
      q: query || undefined,
      status: status === "all" ? undefined : status,
      category: category === "all" ? undefined : category,
      sort: "created_at",
      dir: "desc" as const,
    }),
    [query, status, category],
  );

  const dialogInitial = useMemo(() => {
    if (!editing) return undefined;
    const draftStatus: "draft" | "published" | "archived" =
      editing.status === "published" || editing.status === "archived" ? editing.status : "draft";
    return {
      id: editing.id,
      title: resolveProductName(editing),
      slug: editing.slug,
      sku: editing.sku ?? undefined,
      price: resolvePriceValue(editing) ?? 0,
      category_slug: editing.category_slug ?? null,
      status: draftStatus,
      rating: editing.rating ?? undefined,
      short_desc: editing.short_desc ?? undefined,
      images: editing.images ?? undefined,
      tags: editing.tags ?? undefined,
    };
  }, [editing]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Все статусы" },
      { value: "draft", label: "Черновик" },
      { value: "published", label: "Опубликован" },
      { value: "archived", label: "Архив" },
    ],
    [],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await fetchCategories();
      if (mounted) setCategories(data);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status && status !== "all") params.set("status", status);
    if (category && category !== "all") params.set("category", category);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [query, status, category, pathname, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { items, total } = await fetchProducts({ ...currentFilters, limit: pageSize });
        if (!cancelled) {
          setItems(items);
          setTotal(total);
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
  }, [currentFilters, pageSize, refreshToken]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [items]);

  useEffect(() => {
    const matched = savedViews.find((view) => filtersMatch(view.filters, currentFilters));
    setActiveViewId(matched ? matched.id : "__custom");
  }, [currentFilters, savedViews]);

  const handleDelete = useCallback(
    async (product: ProductRow) => {
      const productTitle = resolveProductName(product);
      const confirmed = window.confirm(
        productTitle
          ? `Удалить «${productTitle}»? Это действие нельзя отменить.`
          : "Удалить товар? Это действие нельзя отменить.",
      );
      if (!confirmed) return;
      setDeletingId(product.id);
      try {
        const res = await authorizedFetch("/api/admin-products", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ op: "delete", ids: [product.id] }),
        });
        const responseText = await res.text();
        const payload = parseAdminResponse(responseText);
        if (!res.ok) {
          const errorMessage =
            (payload && typeof payload.error === "string" && payload.error) ||
            responseText ||
            "Failed to archive product";
          throw new Error(errorMessage);
        }
        if (payload && payload.ok === false) {
          const errorMessage =
            (typeof payload.error === "string" && payload.error) || "Failed to archive product";
          throw new Error(errorMessage);
        }

        const archivedCount =
          payload && typeof payload.archived === "number"
            ? payload.archived
            : payload && typeof payload.deleted === "number"
              ? payload.deleted
              : 1;
        setItems((prev) => prev.filter((item) => item.id !== product.id));
        setTotal((prev) => Math.max(0, prev - archivedCount));
        toast("Товар перемещён в архив", { variant: "success" });
        setRefreshToken((value) => value + 1);
      } catch (err) {
        console.error("products-client: delete failed", err);
        const message = err instanceof Error ? err.message : "Failed to archive product";
        toast(message, { variant: "error" });
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  const handleDuplicate = useCallback(
    async (product: ProductRow) => {
      setDuplicatingId(product.id);
      try {
        const res = await authorizedFetch("/api/admin-products", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ op: "duplicate", ids: [product.id] }),
        });
        const responseText = await res.text();
        const payload = parseAdminResponse(responseText);
        if (!res.ok) {
          const errorMessage =
            (payload && typeof payload.error === "string" && payload.error) ||
            responseText ||
            "Failed to duplicate product";
          throw new Error(errorMessage);
        }
        if (payload && payload.ok === false) {
          const errorMessage =
            (typeof payload.error === "string" && payload.error) || "Failed to duplicate product";
          throw new Error(errorMessage);
        }

        toast("Товар продублирован", { variant: "success" });
        setRefreshToken((value) => value + 1);
      } catch (err) {
        console.error("products-client: duplicate failed", err);
        const message = err instanceof Error ? err.message : "Failed to duplicate product";
        toast(message, { variant: "error" });
      } finally {
        setDuplicatingId(null);
      }
    },
    [],
  );

  const categoryLabel = useCallback(
    (slug: string | null) => {
      if (!slug) return "-";
      const match = categories.find((item) => item.slug === slug);
      return match?.name ?? slug;
    },
    [categories],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelectedIds(new Set());
        return;
      }
      setSelectedIds(new Set(items.map((item) => item.id)));
    },
    [items],
  );

  const handleSaveCurrentView = useCallback(() => {
    const name = window.prompt("Название вида", `Вид ${savedViews.length + 1}`);
    if (!name) return;
    const newView: SavedView = {
      id: `${Date.now()}`,
      name: name.trim(),
      filters: { ...currentFilters },
    };
    setSavedViews((prev) => [...prev, newView]);
    setActiveViewId(newView.id);
    toast("Вид сохранён", { variant: "success" });
  }, [currentFilters, savedViews.length]);

  const handleApplyView = useCallback(
    (view: SavedView) => {
      setActiveViewId(view.id);
      setQuery(view.filters.q ?? "");
      setStatus(view.filters.status ?? "all");
      setCategory(view.filters.category ?? "all");
    },
    [],
  );

  const handleResetFilters = useCallback(() => {
    setQuery("");
    setStatus("all");
    setCategory("all");
  }, []);

  const handleMassAction = useCallback(
    (action: "publish" | "archive" | "export" | "tag") => {
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      switch (action) {
        case "publish":
          toast(`Отправляем ${ids.length} товар(ов) в публикацию`, { variant: "info" });
          break;
        case "archive":
          toast(`Архивируем ${ids.length} товар(ов)`, { variant: "warning" });
          break;
        case "export":
          toast(`Экспортируем ${ids.length} товар(ов) в CSV`, { variant: "info" });
          break;
        case "tag":
          toast(`Назначаем теги для ${ids.length} товар(ов)`, { variant: "info" });
          break;
        default:
          break;
      }
    },
    [selectedIds],
  );

  const handleColumnsChange = useCallback((key: ProductColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      if (next.size === 0) {
        next.add("price");
      }
      return next;
    });
  }, []);

  const handleQuickEdit = useCallback((product: ProductRow) => {
    setEditing(product);
    setDialogOpen(true);
  }, []);

  const selectedCount = selectedIds.size;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const statusLabel = statusOptions.find((option) => option.value === status)?.label ?? "Все статусы";
  const activeFilters = [
    query ? `Поиск: ${query}` : null,
    status !== "all" ? `Статус: ${statusLabel}` : null,
    category !== "all" ? `Категория: ${categoryLabel(category)}` : null,
  ].filter(Boolean) as string[];

  const toolbarContent = (
    <ProductsToolbar
      query={query}
      status={status}
      category={category}
      categories={categories}
      statusOptions={statusOptions}
      savedViews={savedViews}
      activeViewId={activeViewId}
      visibleColumns={visibleColumns}
      pageSize={pageSize}
      onQueryChange={setQuery}
      onStatusChange={setStatus}
      onCategoryChange={setCategory}
      onSaveView={handleSaveCurrentView}
      onApplyView={handleApplyView}
      onResetFilters={handleResetFilters}
      onToggleColumn={handleColumnsChange}
      onPageSizeChange={setPageSize}
      onRefresh={() => setRefreshToken((value) => value + 1)}
      loading={loading}
    />
  );

  const sidebarContent = (
    <>
      <AdminInfoPanel title="Сводка">
        <InfoRow label="На странице" value={items.length} />
        <InfoRow label="Выбрано" value={selectedCount} />
        <InfoRow label="Всего" value={total || items.length} />
      </AdminInfoPanel>
      <AdminInfoPanel title="Активные фильтры">
        {activeFilters.length ? (
          <ul className="space-y-2 text-sm text-admin-textSoft">
            {activeFilters.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Tag size={14} className="text-admin-textSubtle" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-admin-textSubtle">Фильтры не применены.</p>
        )}
      </AdminInfoPanel>
      <AdminInfoPanel title="Сохранённые виды">
        <SavedViewsList savedViews={savedViews} activeViewId={activeViewId} onApplyView={handleApplyView} />
      </AdminInfoPanel>
    </>
  );

  return (
    <AdminContentWrapper>
      <AdminPageLayout
        title="Товары"
        description="Каталог, статусы и остатки по каналам."
        breadcrumbs={[
          { label: "Админка", href: "/admin" },
          { label: "Товары" },
        ]}
        primaryActions={
          <Button onClick={() => router.push("/admin/shop/products/new")}>Создать товар</Button>
        }
        secondaryActions={
          <>
            <Button
              variant="soft"
              className="flex items-center gap-2"
              onClick={() => toast("Импорт CSV выполняется через ERP", { variant: "info" })}
            >
              <Upload size={16} /> Импорт
            </Button>
            <Button
              variant="soft"
              className="flex items-center gap-2"
              onClick={() => toast("Экспорт сформирован и отправлен на почту", { variant: "info" })}
            >
              <Download size={16} /> Экспорт
            </Button>
          </>
        }
        toolbar={toolbarContent}
        sidebar={sidebarContent}
      >
        {selectedCount ? (
          <MassActionsBar
            selectedCount={selectedCount}
            onClear={() => setSelectedIds(new Set())}
            onAction={handleMassAction}
          />
        ) : null}

        {error ? (
          <AdminSurface tone="muted">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-rose-600">{error}</span>
              <Button variant="soft" onClick={() => setRefreshToken((value) => value + 1)}>
                Повторить
              </Button>
            </div>
          </AdminSurface>
        ) : null}

        <AdminSurface padded={false} className="overflow-hidden">
          {loading && !items.length ? (
            <LoadingTableSkeleton rows={6} />
          ) : (
            <ProductsTable
              items={items}
              visibleColumns={visibleColumns}
              selectedIds={selectedIds}
              allSelected={allSelected}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onEdit={(product) => router.push(`/admin/shop/products/${product.id}`)}
              onQuickEdit={handleQuickEdit}
              onDuplicate={handleDuplicate}
              onArchive={handleDelete}
              duplicatingId={duplicatingId}
              deletingId={deletingId}
              categoryLabel={categoryLabel}
            />
          )}
        </AdminSurface>

        <div className="flex flex-col gap-3 text-sm text-admin-textSubtle lg:flex-row lg:items-center lg:justify-between">
          <span>
            Показано {items.length} из {total || items.length} товаров
          </span>
          <div className="flex items-center gap-2">
            <span>Показывать:</span>
            <select
              className="h-10 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.currentTarget.value) || 25)}
            >
              {[25, 50, 100, 250].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </AdminPageLayout>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        initial={dialogInitial}
        categories={normalizedCategories}
        onSaved={() => {
          toast("Сохранено", { variant: "success" });
          setDialogOpen(false);
          setEditing(null);
          setRefreshToken((value) => value + 1);
        }}
      />
    </AdminContentWrapper>
  );
}

function ProductsToolbar({
  query,
  status,
  category,
  categories,
  statusOptions,
  savedViews,
  activeViewId,
  visibleColumns,
  pageSize,
  onQueryChange,
  onStatusChange,
  onCategoryChange,
  onSaveView,
  onApplyView,
  onResetFilters,
  onToggleColumn,
  onPageSizeChange,
  onRefresh,
  loading,
}: {
  query: string;
  status: string;
  category: string;
  categories: CategoryOption[];
  statusOptions: { value: string; label: string }[];
  savedViews: SavedView[];
  activeViewId: string;
  visibleColumns: Set<ProductColumnKey>;
  pageSize: number;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSaveView: () => void;
  onApplyView: (view: SavedView) => void;
  onResetFilters: () => void;
  onToggleColumn: (key: ProductColumnKey) => void;
  onPageSizeChange: (size: number) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <AdminSurface tone="muted" padded="lg" className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          className="flex flex-1 items-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text shadow-sm focus-within:border-admin-primary focus-within:ring-2 focus-within:ring-admin-primary/20"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onRefresh();
          }}
        >
          <Search size={16} className="text-admin-textSubtle" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Поиск: SKU, заказ, клиент..."
            className="h-6 flex-1 bg-transparent text-sm text-admin-text placeholder:text-admin-textSubtle focus:outline-none"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="neutral"
            className="flex items-center gap-2 h-9 min-h-0 px-4"
            onClick={onSaveView}
            disabled={loading}
          >
            <Save size={16} /> Сохранить вид
          </Button>
          <Button
            variant="neutral"
            className="flex items-center gap-2 h-9 min-h-0 px-4"
            onClick={onResetFilters}
            disabled={loading}
          >
            <Filter size={16} /> Сбросить
          </Button>
          <Button
            variant="neutral"
            className="flex items-center gap-2 h-9 min-h-0 px-4"
            onClick={onRefresh}
            disabled={loading}
          >
            <MoreHorizontal size={16} /> Обновить
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-10 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm"
            value={status}
            onChange={(event) => onStatusChange(event.currentTarget.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm"
            value={category}
            onChange={(event) => onCategoryChange(event.currentTarget.value)}
          >
            <option value="all">Все категории</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.currentTarget.value) || 25)}
          >
            {[25, 50, 100, 250].map((size) => (
              <option key={size} value={size}>
                Показать {size}
              </option>
            ))}
          </select>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="neutral" className="flex items-center gap-2 h-9 min-h-0 px-4">
              <Columns3 size={16} /> Колонки
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[220px]">
            <DropdownMenuLabel>Показать</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRODUCT_COLUMNS.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumns.has(column.key)}
                onCheckedChange={() => onToggleColumn(column.key)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SavedViewChips savedViews={savedViews} activeViewId={activeViewId} onApplyView={onApplyView} />
    </AdminSurface>
  );
}

function SavedViewChips({
  savedViews,
  activeViewId,
  onApplyView,
}: {
  savedViews: SavedView[];
  activeViewId: string;
  onApplyView: (view: SavedView) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {savedViews.map((view) => {
        const isActive = view.id === activeViewId;
        return (
          <button
            key={view.id}
            type="button"
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
              isActive
                ? "bg-admin-primary text-admin-primary-foreground"
                : "border border-admin-border bg-admin-surface text-admin-text hover:bg-admin-surfaceMuted",
            )}
            onClick={() => onApplyView(view)}
          >
            {view.name}
          </button>
        );
      })}
    </div>
  );
}

function MassActionsBar({
  selectedCount,
  onClear,
  onAction,
}: {
  selectedCount: number;
  onClear: () => void;
  onAction: (action: "publish" | "archive" | "export" | "tag") => void;
}) {
  return (
    <AdminSurface tone="muted" padded="sm" className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm font-semibold text-admin-text">Выбрано {selectedCount}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="soft" onClick={() => onAction("publish")}>
          Опубликовать
        </Button>
        <Button variant="soft" onClick={() => onAction("archive")}>
          Архивировать
        </Button>
        <Button variant="soft" onClick={() => onAction("tag")}>
          Назначить тег
        </Button>
        <Button variant="soft" onClick={() => onAction("export")}>
          Экспорт CSV
        </Button>
        <Button variant="ghost" onClick={onClear}>
          Очистить
        </Button>
      </div>
    </AdminSurface>
  );
}

function ProductsTable({
  items,
  visibleColumns,
  selectedIds,
  allSelected,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onQuickEdit,
  onDuplicate,
  onArchive,
  duplicatingId,
  deletingId,
  categoryLabel,
}: {
  items: ProductRow[];
  visibleColumns: Set<ProductColumnKey>;
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onEdit: (product: ProductRow) => void;
  onQuickEdit: (product: ProductRow) => void;
  onDuplicate: (product: ProductRow) => void;
  onArchive: (product: ProductRow) => void;
  duplicatingId: string | null;
  deletingId: string | null;
  categoryLabel: (slug: string | null) => string;
}) {
  if (!items.length) {
    return (
      <div className="py-16 text-center text-sm text-admin-textSubtle">
        Ничего не найдено. Попробуйте изменить фильтры.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm text-admin-text">
        <thead className="bg-admin-surfaceSubtle">
          <tr className="text-left text-[11px] uppercase tracking-[0.25em] text-admin-textSubtle">
            <th className="w-10 border-b border-admin-border px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => onToggleSelectAll(event.currentTarget.checked)}
                className="h-4 w-4 rounded border-admin-border"
                aria-label="Выбрать все"
              />
            </th>
            <th className="border-b border-admin-border px-4 py-3">Товар</th>
            {visibleColumns.has("sku") ? <th className="border-b border-admin-border px-4 py-3">SKU</th> : null}
            {visibleColumns.has("price") ? <th className="border-b border-admin-border px-4 py-3">Цена</th> : null}
            {visibleColumns.has("category") ? <th className="border-b border-admin-border px-4 py-3">Категория</th> : null}
            {visibleColumns.has("status") ? <th className="border-b border-admin-border px-4 py-3">Статус</th> : null}
            {visibleColumns.has("rating") ? <th className="border-b border-admin-border px-4 py-3">Рейтинг</th> : null}
            {visibleColumns.has("created_at") ? <th className="border-b border-admin-border px-4 py-3">Создан</th> : null}
            <th className="border-b border-admin-border px-4 py-3 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((product) => {
            const isSelected = selectedIds.has(product.id);
            const displayName = resolveProductName(product) || "—";
            const resolvedPrice = resolvePriceValue(product);
            return (
              <tr
                key={product.id}
                className="border-b border-admin-border/70 last:border-b-0 hover:bg-admin-surfaceMuted/60"
              >
                <td className="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(product.id)}
                    className="h-4 w-4 rounded border-admin-border"
                  />
                </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-admin-text">{displayName}</span>
                        <span className="text-xs text-admin-textSubtle">{product.slug}</span>
                      </div>
                    </td>
                {visibleColumns.has("sku") ? (
                  <td className="px-4 py-3 align-top text-admin-textSubtle">{product.sku ?? "-"}</td>
                ) : null}
                    {visibleColumns.has("price") ? (
                      <td className="px-4 py-3 align-top text-admin-text">{formatCurrency(resolvedPrice)}</td>
                    ) : null}
                {visibleColumns.has("category") ? (
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-admin-surface px-3 py-1 text-xs text-admin-text">
                      <span className={clsx("inline-block h-2 w-2 rounded-full", pickCategoryDot(product.category_slug))} />
                      {categoryLabel(product.category_slug)}
                    </span>
                  </td>
                ) : null}
                {visibleColumns.has("status") ? (
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={product.status ?? "unknown"} />
                  </td>
                ) : null}
                {visibleColumns.has("rating") ? (
                  <td className="px-4 py-3 align-top text-admin-textSubtle">{product.rating ?? 0}</td>
                ) : null}
                {visibleColumns.has("created_at") ? (
                  <td className="px-4 py-3 align-top text-admin-textSubtle">{formatDate(product.created_at)}</td>
                ) : null}
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="neutral" className="h-9 min-h-0 px-4" onClick={() => onEdit(product)}>
                      Открыть
                    </Button>
                    <Button variant="neutral" className="h-9 min-h-0 px-4" onClick={() => onQuickEdit(product)}>
                      Быстро
                    </Button>
                    <Button
                      variant="neutral"
                      className="h-9 min-h-0 px-4 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={duplicatingId === product.id}
                      onClick={() => onDuplicate(product)}
                    >
                      {duplicatingId === product.id ? "Дублируем..." : "Дублировать"}
                    </Button>
                    <Button
                      variant="soft"
                      className="h-9 min-h-0 text-rose-600"
                      disabled={deletingId === product.id}
                      onClick={() => onArchive(product)}
                    >
                      {deletingId === product.id ? "Удаляем..." : "Архив"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SavedViewsList({
  savedViews,
  activeViewId,
  onApplyView,
}: {
  savedViews: SavedView[];
  activeViewId: string;
  onApplyView: (view: SavedView) => void;
}) {
  if (!savedViews.length) {
    return <p className="text-sm text-admin-textSubtle">Нет сохранённых видов.</p>;
  }
  return (
    <AdminStack gap="sm">
      {savedViews.map((view) => {
        const isActive = view.id === activeViewId;
        return (
          <button
            key={view.id}
            type="button"
            className={clsx(
              "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
              isActive
                ? "border-admin-primary bg-admin-primary/10 text-admin-primary"
                : "border-admin-border bg-admin-surface text-admin-text hover:bg-admin-surfaceMuted",
            )}
            onClick={() => onApplyView(view)}
          >
            <span>{view.name}</span>
            {isActive ? <span className="text-xs uppercase tracking-[0.2em] text-admin-primary">Активно</span> : null}
          </button>
        );
      })}
    </AdminStack>
  );
}

function LoadingTableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3 px-4 py-6">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-admin-textSubtle">{label}</span>
      <span className="font-semibold text-admin-text">{value}</span>
    </div>
  );
}
