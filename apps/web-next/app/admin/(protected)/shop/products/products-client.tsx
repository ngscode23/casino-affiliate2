
"use client";

import { useEffect, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import Section from "@ui/components/common/section";
import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import Skeleton from "@ui/components/common/skeleton";
import StatusBadge from "@ui/components/admin/StatusBadge";
import ProductDialog from "@ui/components/admin/ProductDialog";
import { toast } from "@ui/components/common/toast";
import { getValidAccessToken } from "@shared/lib/auth";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import { adminFetch } from "@shared/lib/api";
import clsx from "clsx";

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  price: number;
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
  color?: string | null;
}

interface FetchParams {
  q?: string;
  status?: string;
  category?: string;
  sort?: string;
  dir?: "asc" | "desc";
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
  url.searchParams.set("limit", "25");

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
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.items)
      ? (json.items as CategoryOption[])
      : [];
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

export function ProductsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [query, setQuery] = useState(() => sanitizeSearchParam(searchParams?.get("q")));
  const [status, setStatus] = useState(() => searchParams?.get("status") ?? "all");
  const [category, setCategory] = useState(() => searchParams?.get("category") ?? "all");
  const [items, setItems] = useState<ProductRow[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const normalizedCategories = useMemo(
    () => categories.map((item) => ({ ...item, color: item.color ?? undefined })),
    [categories],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);

  const dialogInitial = useMemo(() => {
    if (!editing) return undefined;
    const status: 'draft' | 'published' | 'archived' =
      editing.status === 'published' || editing.status === 'archived' ? editing.status : 'draft';
    return {
      id: editing.id,
      title: editing.title,
      slug: editing.slug,
      sku: editing.sku ?? undefined,
      price: editing.price ?? 0,
      category_slug: editing.category_slug ?? null,
      status,
      rating: editing.rating ?? undefined,
      short_desc: editing.short_desc ?? undefined,
      images: editing.images ?? undefined,
      tags: editing.tags ?? undefined,
    };
  }, [editing]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      { value: "draft", label: "Draft" },
      { value: "published", label: "Published" },
      { value: "archived", label: "Archived" },
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
        const { items, total } = await fetchProducts({
          q: query || undefined,
          status: status || undefined,
          category: category || undefined,
          sort: "created_at",
          dir: "desc",
        });
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
  }, [query, status, category, refreshToken]);

  const handleDelete = async (product: ProductRow) => {
    const productTitle = (product.title ?? "").trim();
    const confirmed = window.confirm(
      productTitle
        ? `Delete "${productTitle}"? This action cannot be undone.`
        : "Delete this product? This action cannot be undone.",
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
      toast("Product archived", { variant: "success" });
      setRefreshToken((value) => value + 1);
    } catch (err) {
      console.error("products-client: delete failed", err);
      const message = err instanceof Error ? err.message : "Failed to archive product";
      toast(message, { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (product: ProductRow) => {
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

      toast("Product duplicated", { variant: "success" });
      setRefreshToken((value) => value + 1);
    } catch (err) {
      console.error("products-client: duplicate failed", err);
      const message = err instanceof Error ? err.message : "Failed to duplicate product";
      toast(message, { variant: "error" });
    } finally {
      setDuplicatingId(null);
    }
  };

  const categoryLabel = (slug: string | null) => {
    if (!slug) return "-";
    const match = categories.find((item) => item.slug === slug);
  return match?.name ?? slug;
};

const TILE_BASE =
  "relative overflow-hidden rounded-3xl border border-white/6 bg-[#0c141f]/85 p-6 shadow-[0_28px_55px_rgba(8,12,32,0.55)] backdrop-blur";
const TILE_MUTED =
  "relative overflow-hidden rounded-3xl border border-white/5 bg-[#0a121f]/80 p-6 shadow-[0_22px_38px_rgba(8,12,32,0.45)] backdrop-blur";
const TILE_ACCENT =
  "relative overflow-hidden rounded-3xl border border-sky-500/40 bg-gradient-to-br from-[#142742] via-[#101c2e] to-[#091321] p-6 shadow-[0_32px_55px_rgba(14,116,219,0.35)] backdrop-blur";
const TITLE_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400";
const SUBTEXT_CLASS = "text-sm text-slate-400";

type TileTone = "base" | "muted" | "accent";

type TileProps = HTMLAttributes<HTMLDivElement> & {
  tone?: TileTone;
  children: ReactNode;
};

function Tile({ tone = "base", className, children, ...rest }: TileProps) {
  const toneClass = tone === "muted" ? TILE_MUTED : tone === "accent" ? TILE_ACCENT : TILE_BASE;
  return (
    <div {...rest} className={clsx(toneClass, className)}>
      {children}
    </div>
  );
}

  const statusLabel = statusOptions.find((option) => option.value === status)?.label ?? status;
  const activeFilterLabels = [
    status !== "all" ? `Status: ${statusLabel}` : null,
    category !== "all" ? `Category: ${categoryLabel(category)}` : null,
    query ? `Search: "${query}"` : null,
  ].filter(Boolean) as string[];
  const filtersSummary = activeFilterLabels.join(" · ");
  const filteredCount = items.length;

  return (
    <Section className="space-y-8 !px-3 sm:!px-6 lg:!px-10 pb-12">
      <Tile tone="accent" className="overflow-hidden">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className={TITLE_LABEL_CLASS}>Catalog</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Products</h1>
            <p className={SUBTEXT_CLASS}>
              {total ? `Total ${total} items` : "Manage marketplace inventory"}
              {activeFilterLabels.length ? ` · ${filtersSummary}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="rounded-full bg-[#f40083] px-5 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-[0_12px_30px_rgba(244,0,131,0.35)] transition hover:shadow-[0_16px_36px_rgba(244,0,131,0.45)]"
              onClick={() => router.push("/admin/shop/products/new")}
            >
              Add product
            </Button>
            <Button
              variant="ghost"
              className="rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 hover:border-white/20 hover:bg-white/15"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              Quick add
            </Button>
          </div>
        </div>
        <span className="pointer-events-none absolute -right-10 top-1/2 hidden h-56 w-56 -translate-y-1/2 rounded-full bg-sky-500/20 blur-3xl lg:block" />
      </Tile>

      <Tile tone="base" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_220px_220px]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search products..."
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
          />
          <select
            className="h-12 rounded-2xl border border-white/10 bg-[#0b1524]/80 px-4 text-sm text-slate-100 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
            value={status}
            onChange={(event) => setStatus(event.currentTarget.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="h-12 rounded-2xl border border-white/10 bg-[#0b1524]/80 px-4 text-sm text-slate-100 focus:border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
            value={category}
            onChange={(event) => setCategory(event.currentTarget.value)}
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        {activeFilterLabels.length ? (
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Filters: {filtersSummary}
          </div>
        ) : null}
      </Tile>

      {loading ? (
        <Tile tone="muted" className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-2xl" />
          ))}
        </Tile>
      ) : error ? (
        <Tile tone="muted" className="text-sm text-rose-300">{error}</Tile>
      ) : filteredCount === 0 ? (
        <Tile tone="muted" className="py-12 text-center text-sm text-slate-400">
          No products found.
        </Tile>
      ) : (
        <Tile tone="muted" className="p-0">
          <div className="flex items-center justify-between px-6 py-4 text-xs text-slate-400">
            <span className="uppercase tracking-[0.3em]">
              Showing {filteredCount} of {total || filteredCount} items
            </span>
            {activeFilterLabels.length ? (
              <span className="hidden uppercase tracking-[0.3em] sm:inline">
                {filtersSummary}
              </span>
            ) : null}
          </div>
          <div className="overflow-x-auto px-2 pb-4">
            <table className="min-w-full border-separate border-spacing-y-3 text-sm text-slate-100">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.3em] text-slate-500">
                  <th className="px-4">Title</th>
                  <th className="px-4">Status</th>
                  <th className="px-4">Price</th>
                  <th className="px-4">Category</th>
                  <th className="px-4">Rating</th>
                  <th className="px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr
                    key={product.id}
                    className="rounded-2xl bg-white/5 text-slate-100 shadow-[0_18px_35px_rgba(8,12,32,0.4)] backdrop-blur transition hover:bg-white/10"
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-white">{product.title}</div>
                      <div className="text-xs text-slate-400">{product.slug}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <StatusBadge status={product.status ?? "unknown"} />
                    </td>
                    <td className="px-4 py-4 align-top">
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: "EUR",
                      }).format(product.price ?? 0)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100">
                        <span className={clsx("inline-block h-2 w-2 rounded-full", pickCategoryDot(product.category_slug))} />
                        {categoryLabel(product.category_slug)}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-300">{product.rating ?? 0}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          className="h-9 min-h-0 rounded-full bg-sky-500 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_12px_30px_rgba(56,189,248,0.4)] hover:bg-sky-400"
                          onClick={() => router.push(`/admin/shop/products/${product.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-9 min-h-0 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-100 hover:border-white/20 hover:bg-white/15"
                          onClick={() => {
                            setEditing(product);
                            setDialogOpen(true);
                          }}
                        >
                          Quick edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-9 min-h-0 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-100 hover:border-white/20 hover:bg-white/15 disabled:opacity-60"
                          disabled={duplicatingId === product.id}
                          onClick={() => handleDuplicate(product)}
                        >
                          {duplicatingId === product.id ? "Duplicating..." : "Duplicate"}
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-9 min-h-0 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-rose-200 hover:border-rose-400 hover:bg-rose-500/20 disabled:opacity-50 disabled:pointer-events-none"
                          disabled={deletingId === product.id}
                          onClick={() => handleDelete(product)}
                        >
                          {deletingId === product.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tile>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        initial={dialogInitial}
        categories={normalizedCategories}
        onSaved={() => {
          toast("Saved", { variant: "success" });
          setDialogOpen(false);
          setEditing(null);
          // trigger refetch
          setRefreshToken((value) => value + 1);
        }}
      />
    </Section>
  );
}

