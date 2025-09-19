import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Button from "@/components/common/button";
import Input from "@/components/common/input";
import Select from "@/components/common/select";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import Stars from "@/components/admin/Stars";
import ProductDialog from "@/components/admin/ProductDialog";
import { toast } from "@/components/common/toast";
import Skeleton from "@/components/common/skeleton";
import { getValidAccessToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { SUPABASE_PRODUCT_IMAGES_BUCKET } from "@/config";
import { Loader2, UploadCloud } from "lucide-react";

type Item = {
  id: string;
  slug: string;
  title: string;
  price: number;
  rating: number;
  images: string[] | null;
  category_slug: string | null;
  created_at: string;
  status?: string | null;
};

type FetchParams = {
  q?: string;
  category?: string;
  status?: string;
  ratingMin?: number;
  page: number;
  limit: number;
  sort: string;
  dir: "asc" | "desc";
};

const DEV_TOKEN = (import.meta as any).env?.VITE_ADMIN_TOKEN as string | undefined;

async function authorizedFetch(input: string, init: RequestInit = {}, opts: { includeAdminToken?: boolean } = {}) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (opts.includeAdminToken) headers.set("x-admin-token", DEV_TOKEN || "");
  return fetch(input, { ...init, headers });
}

async function fetchProducts({ q, category, status, ratingMin, page, limit, sort, dir }: FetchParams) {
  const url = new URL("/api/ecom-products", window.location.origin);
  if (q) url.searchParams.set("q", q);
  if (category && category !== "all") url.searchParams.set("category", category);
  if (status && status !== "all") url.searchParams.set("status", status);
  if (ratingMin) url.searchParams.set("min_rating", String(ratingMin));
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("sort", sort);
  url.searchParams.set("dir", dir);

  const res = await authorizedFetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return {
    items: (json.items || []) as Item[],
    total: Number(json.total || 0),
  };
}

async function fetchCategories() {
  try {
    const res = await authorizedFetch("/api/ecom-categories");
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.items || []) as Array<{ slug: string; name: string; color?: string }>;
  } catch (error) {
    console.error("Failed to load categories", error);
    return [];
  }
}

export default function AdminShopProductsIndex() {
  const navigate = useNavigate();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [ratingMin, setRatingMin] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Array<{ slug: string; name: string; color?: string }>>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [dense, setDense] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { items, total } = await fetchProducts({
        q,
        category,
        status,
        ratingMin: ratingMin || undefined,
        page,
        limit,
        sort: sortKey,
        dir: sortDir,
      });
      setItems(items);
      setTotal(total);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }, [q, category, status, ratingMin, page, limit, sortKey, sortDir]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [items]);

  const duplicateRow = useCallback(async (row: Item) => {
    try {
      const res = await authorizedFetch("/api/admin-products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "duplicate", ids: [row.id] }),
      }, { includeAdminToken: true });
      if (!res.ok) throw new Error(await res.text());
      toast("Product duplicated", { variant: "success" });
      await load();
    } catch (err: any) {
      toast(String(err?.message || err), { variant: "error" });
    }
  }, [load]);

  const columns: Column<Item>[] = useMemo(() => [
    {
      key: "id",
      header: "ID",
      width: "120px",
      render: (row) => <span className="font-mono text-xs">{row.id.slice(0, 8)}</span>,
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          {Array.isArray(row.images) && row.images[0] ? (
            <img src={row.images[0]} alt="" className="w-8 h-8 rounded object-cover border border-white/10" />
          ) : (
            <div className="w-8 h-8 rounded bg-white/5" />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium">{row.title}</div>
            <div className="text-[10px] text-[var(--text-dim)]">{row.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "category_slug",
      header: "Category",
      render: (row) => <CategoryBadge slug={row.category_slug} categories={categories} />,
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      align: "right",
      render: (row) => <span>${row.price.toFixed(2)}</span>,
    },
    {
      key: "rating",
      header: "Rating",
      sortable: true,
      align: "right",
      render: (row) => (
        <div className="inline-flex items-center gap-1 justify-end">
          <Stars value={row.rating} />
          <span className="text-xs">{Number.isFinite(row.rating) ? row.rating.toFixed(1) : "0.0"}</span>
        </div>
      ),
    },
    { key: "created_at", header: "Created", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status || "published"} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="inline-flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-8 min-h-0 px-2 text-sm"
            onClick={() => {
              setEditing(row);
              setDialogOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="soft"
            className="h-8 min-h-0 px-3 text-sm"
            onClick={() => duplicateRow(row)}
          >
            Duplicate
          </Button>
        </div>
      ),
    },
  ], [categories, duplicateRow]);

  const onSortChange = useCallback((key: string, dir: "asc" | "desc") => {
    setSortKey(key);
    setSortDir(dir);
    setPage(1);
  }, []);

  const onPageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  const onPageSizeChange = useCallback((size: number) => {
    setLimit(size);
    setPage(1);
  }, []);

  async function bulkStatus(nextStatus: "draft" | "published" | "archived") {
    if (!selectedIds.length) {
      toast("Select rows first", { variant: "info" });
      return;
    }
    if (!confirm(`Apply status "${nextStatus}" to ${selectedIds.length} item(s)?`)) return;

    const previous = items;
    setItems((current) => current.map((item) => (selectedIds.includes(item.id) ? { ...item, status: nextStatus } : item)));
    try {
      const res = await authorizedFetch("/api/admin-products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "status", ids: selectedIds, status: nextStatus }),
      }, { includeAdminToken: true });
      if (!res.ok) throw new Error(await res.text());
      toast("Status updated", { variant: "success" });
      setSelectedIds([]);
      await load();
    } catch (err: any) {
      toast(String(err?.message || err), { variant: "error" });
      setItems(previous);
    }
  }

  async function bulkDelete() {
    if (!selectedIds.length) {
      toast("Select rows first", { variant: "info" });
      return;
    }
    if (!confirm(`Delete ${selectedIds.length} item(s)? This cannot be undone.`)) return;

    const previous = items;
    setItems((current) => current.filter((item) => !selectedIds.includes(item.id)));
    try {
      const res = await authorizedFetch("/api/admin-products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "delete", ids: selectedIds }),
      }, { includeAdminToken: true });
      if (!res.ok) throw new Error(await res.text());
      toast("Deleted", { variant: "success" });
      setSelectedIds([]);
      await load();
    } catch (err: any) {
      toast(String(err?.message || err), { variant: "error" });
      setItems(previous);
    }
  }

  async function bulkDuplicate() {
    if (!selectedIds.length) {
      toast("Select rows first", { variant: "info" });
      return;
    }
    try {
      const res = await authorizedFetch("/api/admin-products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "duplicate", ids: selectedIds }),
      }, { includeAdminToken: true });
      if (!res.ok) throw new Error(await res.text());
      toast("Duplicated", { variant: "success" });
      setSelectedIds([]);
      await load();
    } catch (err: any) {
      toast(String(err?.message || err), { variant: "error" });
    }
  }

  const ratingOptions = [0, 1, 2, 3, 4, 5];

  function safeSegment(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function storagePathFor(file: File): string {
    const ext = file.name.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "") || "jpg";
    const baseName = safeSegment(file.name.replace(/\.[^.]+$/, "")) || "asset";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `${baseName}/${timestamp}-${random}.${ext}`;
  }

  async function handleUpload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    const bucket = SUPABASE_PRODUCT_IMAGES_BUCKET;
    const storage = supabase.storage.from(bucket);
    const files = Array.from(list);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const path = storagePathFor(file);
        const { error } = await storage.upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        const { data } = storage.getPublicUrl(path);
        if (!data?.publicUrl) throw new Error("Failed to resolve public URL");
        uploaded.push(data.publicUrl);
      }
      if (uploaded.length) {
        toast(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded`, { variant: "success" });
      }
    } catch (err: any) {
      const message = String(err?.message || err);
      toast(message.includes("duplicate") ? "File already exists in bucket" : message, { variant: "error" });
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  }

  return (
    <>
      <Section className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Products</h1>
          <div className="flex items-center gap-2">
            <button
              className={`rounded-xl px-3 py-2 border border-white/10 text-sm hover:bg-white/5 ${dense ? "bg-white/10 border-white/15" : ""}`}
              onClick={() => setDense((value) => !value)}
              title="Toggle density"
              type="button"
            >
              {dense ? "Comfort" : "Compact"}
            </button>
            <Button
              variant="soft"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {uploading ? "Uploading" : "Upload Images"}
            </Button>
            <Button
              onClick={() => {
                navigate("/admin/shop/products/new");
              }}
            >
              + Add Product
            </Button>
          </div>
        </div>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => handleUpload(event.currentTarget.files)}
        />

        {/* Filters */}
        <Card className="p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-64 max-w-full"
              placeholder="Search title or slug"
              value={q}
              onChange={(event) => {
                setPage(1);
                setQ(event.target.value);
              }}
            />
            <Select
              className="w-48"
              value={category}
              onChange={(event) => {
                setPage(1);
                setCategory(event.target.value);
              }}
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </Select>
            <Select
              className="w-40"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
            <Select
              className="w-44"
              value={ratingMin}
              onChange={(event) => {
                setPage(1);
                setRatingMin(Number(event.target.value));
              }}
            >
              {ratingOptions.map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? "Any rating" : `Rating >= ${value}`}
                </option>
              ))}
            </Select>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button variant="soft" className="h-11 min-h-0" onClick={() => void bulkStatus("draft")}>
                Draft
              </Button>
              <Button variant="soft" className="h-11 min-h-0" onClick={() => void bulkStatus("published")}>
                Publish
              </Button>
              <Button variant="soft" className="h-11 min-h-0" onClick={() => void bulkStatus("archived")}>
                Archive
              </Button>
              <Button variant="soft" className="h-11 min-h-0" onClick={() => void bulkDuplicate()}>
                Duplicate selected
              </Button>
              <Button variant="soft" className="h-11 min-h-0" onClick={() => void bulkDelete()}>
                Delete
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-0">
          {loading ? (
            <div className="p-4">
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-red-400">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="text-lg font-semibold">No products yet</div>
              <div className="text-[var(--text-dim)]">Add your first product to get started</div>
              <div>
                <Button onClick={() => { navigate("/admin/shop/products/new"); }}>+ Add Product</Button>
              </div>
            </div>
          ) : (
            <DataTable
              rows={items}
              columns={columns}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={onSortChange}
              page={page}
              pageSize={limit}
              total={total}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              onSelectionChange={setSelectedIds}
              rowId={(row) => row.id}
              density={dense ? "compact" : "comfortable"}
            />
          )}
        </Card>
      </Section>

      <ProductDialog
        open={dialogOpen} key={(editing?.id || "new")}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setEditing(null);
        }}
        initial={editing as any}
        categories={categories}
        onSaved={() => {
          setPage(1);
          void load();
        }}
      />
    </>
  );
}

function stringToHslColor(str: string, s = 60, l = 42) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

function CategoryBadge({
  slug,
  categories,
}: {
  slug: string | null;
  categories: Array<{ slug: string; name: string; color?: string }>;
}) {
  if (!slug) {
    return <span className="text-xs rounded px-2 py-0.5 border border-white/10">-</span>;
  }
  const category = categories.find((item) => item.slug === slug);
  const name = category?.name || slug;
  const color = category?.color || stringToHslColor(slug);
  return (
    <span
      className="inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 border"
      style={{
        borderColor: color,
        background: `color-mix(in oklab, ${color} 15%, transparent)`,
      }}
    >
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}










