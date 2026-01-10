"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";
import { AdminStack, AdminSurface } from "@/components/admin/layout";

const INVENTORY_OPTIONS = ["in_stock", "out_of_stock", "preorder", "backorder", "discontinued"];

type SupplierRecord = {
  id: string;
  code: string;
  name: string;
  status: string | null;
  default_currency: string | null;
};

type EcomProductRecord = {
  id: string;
  sku?: string | null;
  slug: string;
  title: string;
  currency?: string | null;
};

type SupplierSkuRecord = {
  id: string;
  supplier_id: string;
  sku_id: string;
  supplier_sku: string | null;
  cost_cents: number | null;
  currency: string | null;
  lead_time_days: number | null;
  is_available: boolean | null;
  inventory_status: string | null;
  stock_quantity: number | null;
  last_synced_at?: string | null;
  last_seen_at?: string | null;
  miss_count?: number | null;
  ecom_products?: EcomProductRecord | null;
};

type ApiListResponse<T> = {
  ok?: boolean;
  items?: T[];
  error?: string;
  message?: string;
};

type ApiMutationResponse<T> = {
  ok?: boolean;
  item?: T;
  stats?: Record<string, unknown>;
  error?: string;
  message?: string;
};

type FormState = {
  id: string | null;
  skuId: string;
  supplierSku: string;
  costCents: string;
  currency: string;
  leadTimeDays: string;
  isAvailable: boolean;
  inventoryStatus: string;
  stockQuantity: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  skuId: "",
  supplierSku: "",
  costCents: "",
  currency: "USD",
  leadTimeDays: "",
  isAvailable: true,
  inventoryStatus: "in_stock",
  stockQuantity: "",
};

async function fetchSuppliers(): Promise<SupplierRecord[]> {
  const response = await fetch("/api/admin/suppliers", { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse<SupplierRecord>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to load suppliers.");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function fetchMappings(supplierId: string): Promise<SupplierSkuRecord[]> {
  const url = new URL("/api/admin/supplier-skus", window.location.origin);
  url.searchParams.set("supplier_id", supplierId);
  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse<SupplierSkuRecord>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to load supplier SKUs.");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function searchSkus(query: string): Promise<EcomProductRecord[]> {
  const url = new URL("/api/ecom-products", window.location.origin);
  url.searchParams.set("source", "sku");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "20");
  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as { items?: EcomProductRecord[] };
  if (!response.ok) {
    throw new Error("Failed to search SKUs.");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function saveMapping(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/supplier-skus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse<SupplierSkuRecord>;
  if (!response.ok || !result.ok || !result.item) {
    throw new Error(result.message || result.error || "Failed to save mapping.");
  }
  return result.item;
}

async function updateMapping(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/supplier-skus", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse<SupplierSkuRecord>;
  if (!response.ok || !result.ok || !result.item) {
    throw new Error(result.message || result.error || "Failed to update mapping.");
  }
  return result.item;
}

async function bulkMatchBySku(supplierId: string) {
  const response = await fetch("/api/admin/supplier-skus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ op: "bulk_match", supplier_id: supplierId }),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse<SupplierSkuRecord>;
  if (!response.ok || !result.ok) {
    throw new Error(result.message || result.error || "Bulk mapping failed.");
  }
  return result.stats ?? {};
}

function formatCurrency(value?: number | null, currency?: string | null) {
  if (value == null) return "-";
  const ccy = currency || "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(value / 100);
  } catch {
    return `${value} ${ccy}`;
  }
}

export function SupplierSkusClient() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [mappings, setMappings] = useState<SupplierSkuRecord[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EcomProductRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [autoMapping, setAutoMapping] = useState(false);

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null,
    [suppliers, selectedSupplierId],
  );

  useEffect(() => {
    fetchSuppliers()
      .then((items) => {
        setSuppliers(items);
        if (!selectedSupplierId && items.length) {
          setSelectedSupplierId(items[0].id);
        }
      })
      .catch((error) => {
        console.error(error);
        toast(error?.message || "Failed to load suppliers.", { variant: "error" });
      });
    // Загружаем список поставщиков один раз на маунт
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMappings = useCallback(async () => {
    if (!selectedSupplierId) return;
    setLoadingMappings(true);
    try {
      const data = await fetchMappings(selectedSupplierId);
      setMappings(data);
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Failed to load supplier SKUs.", { variant: "error" });
    } finally {
      setLoadingMappings(false);
    }
  }, [selectedSupplierId]);

  useEffect(() => {
    loadMappings().catch(() => undefined);
  }, [loadMappings]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchSkus(searchQuery.trim());
      setSearchResults(results);
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Failed to search SKUs.", { variant: "error" });
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    // When supplier changes reset form, search results and currency fallback
    setForm({
      ...EMPTY_FORM,
      currency: (selectedSupplier?.default_currency || "USD").toUpperCase(),
    });
    setMappings([]);
    setSearchResults([]);
    setSearchQuery("");
  }, [selectedSupplier]);

  const handleSelectSku = (product: EcomProductRecord) => {
    const currency = (product.currency || selectedSupplier?.default_currency || "USD").toUpperCase();
    setForm((prev) => ({
      ...prev,
      skuId: product.id,
      supplierSku: product.sku || prev.supplierSku || product.slug,
      currency,
    }));
  };

  const startEdit = (record: SupplierSkuRecord) => {
    setForm({
      id: record.id,
      skuId: record.sku_id,
      supplierSku: record.supplier_sku ?? "",
      costCents: record.cost_cents != null ? String(record.cost_cents) : "",
      currency: (record.currency || selectedSupplier?.default_currency || "USD").toUpperCase(),
      leadTimeDays: record.lead_time_days != null ? String(record.lead_time_days) : "",
      isAvailable: record.is_available ?? true,
      inventoryStatus: record.inventory_status || "in_stock",
      stockQuantity: record.stock_quantity != null ? String(record.stock_quantity) : "",
    });
  };

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      currency: (selectedSupplier?.default_currency || "USD").toUpperCase(),
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (!selectedSupplierId) {
      toast("Select a supplier first.", { variant: "error" });
      return;
    }
    if (!form.skuId.trim()) {
      toast("Choose a SKU to map.", { variant: "error" });
      return;
    }
    if (!form.supplierSku.trim()) {
      toast("Supplier SKU is required.", { variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: form.id ?? undefined,
        supplier_id: selectedSupplierId,
        sku_id: form.skuId.trim(),
        supplier_sku: form.supplierSku.trim(),
        cost_cents: form.costCents ? Number(form.costCents) : null,
        currency: form.currency.trim() || selectedSupplier?.default_currency || "USD",
        lead_time_days: form.leadTimeDays ? Number(form.leadTimeDays) : null,
        is_available: form.isAvailable,
        inventory_status: form.inventoryStatus || null,
        stock_quantity: form.stockQuantity ? Number(form.stockQuantity) : null,
      };

      const saved = form.id ? await updateMapping(payload) : await saveMapping(payload);
      setMappings((prev) => {
        const next = prev.filter((item) => item.id !== saved.id);
        next.unshift(saved);
        return next;
      });
      toast(form.id ? "Mapping updated." : "Mapping created.", { variant: "success" });
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Failed to save mapping.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkMatch = async () => {
    if (!selectedSupplierId) return;
    const confirmed = window.confirm("Auto-map supplier SKUs using existing product SKU values?");
    if (!confirmed) return;
    setAutoMapping(true);
    try {
      const stats = await bulkMatchBySku(selectedSupplierId);
      toast(`Bulk mapping complete. Upserted: ${stats.upserted ?? 0}`, { variant: "success" });
      await loadMappings();
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Bulk mapping failed.", { variant: "error" });
    } finally {
      setAutoMapping(false);
    }
  };

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Supplier</label>
            <select
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={selectedSupplierId}
              onChange={(event) => setSelectedSupplierId(event.target.value)}
            >
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="neutral" onClick={loadMappings} disabled={!selectedSupplierId || loadingMappings}>
              Refresh mappings
            </Button>
            <Button variant="soft" onClick={handleBulkMatch} disabled={!selectedSupplierId || autoMapping}>
              {autoMapping ? "Auto-mapping..." : "Auto-map by SKU"}
            </Button>
          </div>
        </div>
      </AdminSurface>

      <AdminSurface>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Search SKU</label>
              <div className="flex gap-2">
                <input
                  type="search"
                  className="flex-1 rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by title, SKU, or slug"
                />
                <Button type="button" variant="neutral" onClick={handleSearch} disabled={searching}>
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>
              {searchResults.length ? (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-admin-border bg-admin-surface">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full flex-col gap-1 border-b border-admin-border/60 px-4 py-3 text-left text-sm hover:bg-admin-surfaceMuted"
                      onClick={() => handleSelectSku(item)}
                    >
                      <span className="font-semibold text-admin-text">{item.title}</span>
                      <span className="text-xs text-admin-textSoft">
                        {item.sku || item.slug} - {item.id}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">SKU id</label>
              <input
                type="text"
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.skuId}
                onChange={(event) => setForm((prev) => ({ ...prev, skuId: event.target.value }))}
                placeholder="UUID of ecom_products"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Supplier SKU</label>
              <input
                type="text"
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.supplierSku}
                onChange={(event) => setForm((prev) => ({ ...prev, supplierSku: event.target.value }))}
                placeholder="VENDOR-001"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Cost (cents)</label>
              <input
                type="number"
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.costCents}
                onChange={(event) => setForm((prev) => ({ ...prev, costCents: event.target.value }))}
                placeholder="12000"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Currency</label>
              <input
                type="text"
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                placeholder="USD"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Lead time (days)</label>
              <input
                type="number"
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.leadTimeDays}
                onChange={(event) => setForm((prev) => ({ ...prev, leadTimeDays: event.target.value }))}
                placeholder="3"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Stock quantity</label>
              <input
                type="number"
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.stockQuantity}
                onChange={(event) => setForm((prev) => ({ ...prev, stockQuantity: event.target.value }))}
                placeholder="10"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Inventory status</label>
              <select
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.inventoryStatus}
                onChange={(event) => setForm((prev) => ({ ...prev, inventoryStatus: event.target.value }))}
              >
                {INVENTORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-semibold text-admin-text">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-admin-border"
              checked={form.isAvailable}
              onChange={(event) => setForm((prev) => ({ ...prev, isAvailable: event.target.checked }))}
            />
            Available
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : form.id ? "Update mapping" : "Create mapping"}
            </Button>
            <Button type="button" variant="soft" onClick={resetForm} disabled={saving}>
              {form.id ? "Cancel" : "Clear"}
            </Button>
          </div>
        </form>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Mapped SKUs</h2>
            <p className="text-sm text-admin-textSoft">Total: {mappings.length}</p>
          </div>
          <Button variant="neutral" onClick={loadMappings} disabled={loadingMappings || !selectedSupplierId}>
            Refresh
          </Button>
        </div>

        {loadingMappings ? (
          <p className="py-6 text-sm text-admin-textSoft">Loading mappings...</p>
        ) : mappings.length === 0 ? (
          <p className="py-6 text-sm text-admin-textSoft">No SKUs mapped for this supplier yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Supplier SKU</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Lead time</th>
                  <th className="px-3 py-2">Availability</th>
                  <th className="px-3 py-2">Inventory</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => {
                  const product = mapping.ecom_products;
                  return (
                    <tr key={mapping.id} className="border-t border-admin-border">
                      <td className="px-3 py-3">
                        <div className="font-medium text-admin-text">{product?.title ?? "Unknown"}</div>
                        <div className="text-xs text-admin-textSoft">
                          {product?.sku || product?.slug || mapping.sku_id}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">{mapping.supplier_sku ?? "-"}</td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {formatCurrency(mapping.cost_cents, mapping.currency ?? product?.currency)}
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {mapping.lead_time_days != null ? `${mapping.lead_time_days} days` : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                            mapping.is_available === false
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700",
                          )}
                        >
                          {mapping.is_available === false ? "Unavailable" : "Available"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {mapping.inventory_status || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="neutral"
                            className="min-h-[36px] px-3 py-2 text-sm"
                            onClick={() => startEdit(mapping)}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurface>
    </AdminStack>
  );
}
