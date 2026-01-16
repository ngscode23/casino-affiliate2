"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { toast } from "@ui/components/common/toast";
import { AdminStack, AdminSurface } from "@/components/admin/layout";

type Supplier = { id: string; name: string; code: string };
type EcomProduct = { id: string; sku?: string | null; slug?: string | null; title?: string | null };
type SupplierSku = { id: string; supplier_sku?: string | null };

type SupplierInventory = {
  id: string;
  supplier_id: string;
  sku_id: string;
  supplier_sku_id?: string | null;
  stock_quantity: number | null;
  is_available: boolean | null;
  inventory_status: string | null;
  last_synced_at?: string | null;
  updated_at?: string | null;
  suppliers?: Supplier | null;
  ecom_products?: EcomProduct | null;
  supplier_skus?: SupplierSku | null;
};

type ApiList<T> = { ok?: boolean; items?: T[]; error?: string; message?: string };

const STATUS_STYLES: Record<string, string> = {
  in_stock: "bg-emerald-100 text-emerald-700",
  out_of_stock: "bg-rose-100 text-rose-700",
  preorder: "bg-amber-100 text-amber-700",
  backorder: "bg-sky-100 text-sky-700",
  discontinued: "bg-slate-200 text-slate-700",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch("/api/admin/suppliers", { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as ApiList<Supplier>;
  if (!res.ok || !json.ok) throw new Error(json.message || json.error || "Failed to load suppliers");
  return json.items ?? [];
}

async function fetchInventory(params: { supplierId?: string; status?: string; q?: string; limit?: number }) {
  const url = new URL("/api/admin/supplier-inventory", window.location.origin);
  if (params.supplierId) url.searchParams.set("supplier_id", params.supplierId);
  if (params.status) url.searchParams.set("inventory_status", params.status);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  const res = await fetch(url.toString(), { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as ApiList<SupplierInventory>;
  if (!res.ok || !json.ok) throw new Error(json.message || json.error || "Failed to load inventory");
  return json.items ?? [];
}

export function SupplierInventoryClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SupplierInventory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers()
      .then((items) => setSuppliers(items))
      .catch((err) => toast(err?.message || "Failed to load suppliers", { variant: "error" }));
  }, []);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInventory({
        supplierId: selectedSupplierId || undefined,
        status: status || undefined,
        q: search.trim() || undefined,
        limit: 200,
      });
      setItems(data);
    } catch (err: any) {
      toast(err?.message || "Failed to load inventory", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedSupplierId, status, search]);

  useEffect(() => {
    loadInventory().catch(() => undefined);
  }, [loadInventory]);

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Supplier</label>
            <select
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Status</label>
            <Input
              value={status}
              onChange={(e) => setStatus(e.target.value.toLowerCase())}
              placeholder="in_stock, out_of_stock..."
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-semibold text-admin-text">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SKU, slug, or title"
              className="bg-white"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="neutral" onClick={loadInventory} disabled={loading}>
            Refresh
          </Button>
        </div>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Inventory</h2>
            <p className="text-sm text-admin-textSoft">Total: {items.length}</p>
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-sm text-admin-textSoft">Loading inventory...</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-sm text-admin-textSoft">No inventory records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2">Supplier SKU</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Available</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last synced</th>
                  <th className="px-3 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = (item.inventory_status || "").toLowerCase();
                  const style = STATUS_STYLES[status] ?? "bg-slate-200 text-slate-700";
                  const product = item.ecom_products;
                  return (
                    <tr key={item.id} className="border-t border-admin-border">
                      <td className="px-3 py-3">
                        <div className="font-medium text-admin-text">{product?.title ?? item.sku_id}</div>
                        <div className="text-xs text-admin-textSoft">{product?.sku || product?.slug || "-"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-admin-text">{item.suppliers?.name ?? item.supplier_id}</div>
                        <div className="text-xs text-admin-textSoft">{item.suppliers?.code ?? ""}</div>
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {item.supplier_skus?.supplier_sku ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {item.stock_quantity != null ? item.stock_quantity : "-"}
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {item.is_available === null ? "-" : item.is_available ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", style)}>
                          {status || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDate(item.last_synced_at)}</td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDate(item.updated_at)}</td>
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
