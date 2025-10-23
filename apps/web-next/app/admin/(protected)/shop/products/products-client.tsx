
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import Skeleton from "@ui/components/common/skeleton";
import StatusBadge from "@ui/components/admin/StatusBadge";
import ProductDialog from "@ui/components/admin/ProductDialog";
import { toast } from "@ui/components/common/toast";
import { getValidAccessToken } from "@shared/lib/auth";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import { adminFetch } from "@shared/lib/api";

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

  return (
    <Section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button onClick={() => router.push("/admin/shop/products/new")}>Add product</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search products..."
          />
          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
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
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
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
      </Card>

      {loading ? (
        <Card className="p-4">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        </Card>
      ) : error ? (
        <Card className="p-4 text-sm text-rose-500">{error}</Card>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No products found.
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Rating</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((product) => (
                <tr key={product.id} className="border-b border-border/20 transition-colors duration-150 hover:bg-card/60">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-foreground">{product.title}</div>
                    <div className="text-xs text-muted-foreground">{product.slug}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={product.status ?? "unknown"} />
                  </td>
                  <td className="py-3 pr-4">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: "EUR",
                    }).format(product.price ?? 0)}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                      <span className={`inline-block h-2 w-2 rounded-full ${pickCategoryDot(product.category_slug)}`} />
                      {categoryLabel(product.category_slug)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{product.rating ?? 0}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="soft"
                        className="h-8 min-h-0 px-3 text-xs"
                        onClick={() => router.push(`/admin/shop/products/${product.id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 min-h-0 px-3 text-xs"
                        onClick={() => {
                          setEditing(product);
                          setDialogOpen(true);
                        }}
                      >
                        Quick edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 min-h-0 px-3 text-xs"
                        disabled={duplicatingId === product.id}
                        onClick={() => handleDuplicate(product)}
                      >
                        {duplicatingId === product.id ? "Duplicating..." : "Duplicate"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 min-h-0 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10 disabled:opacity-50 disabled:pointer-events-none"
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
          <div className="px-4 py-2 text-xs text-muted-foreground">
            Showing {items.length} of {total || items.length} items
          </div>
        </div>
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

