"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { toast } from "@ui/components/common/toast";
import { AdminStack, AdminSurface } from "@/components/admin/layout";

type Supplier = { id: string; name: string; code: string };

type PurchaseOrder = {
  id: string;
  supplier_id: string;
  status: string;
  currency: string | null;
  total_cost_cents: number | null;
  sent_at?: string | null;
  confirmed_at?: string | null;
  shipped_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  error_message?: string | null;
  suppliers?: Supplier | null;
};

type ApiList<T> = { ok?: boolean; items?: T[]; error?: string; message?: string };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  sent: "bg-sky-100 text-sky-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  shipped: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-200 text-slate-700",
};

const STATUSES = ["all", "pending", "sent", "confirmed", "shipped", "failed", "cancelled"] as const;

function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null) return "—";
  const ccy = currency || "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(value / 100);
  } catch {
    return `${value / 100} ${ccy}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
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

async function fetchPurchaseOrders(params: { supplierId?: string; status?: string; limit?: number }) {
  const url = new URL("/api/admin/purchase-orders", window.location.origin);
  if (params.supplierId) url.searchParams.set("supplier_id", params.supplierId);
  if (params.status && params.status !== "all") url.searchParams.set("status", params.status);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  const res = await fetch(url.toString(), { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as ApiList<PurchaseOrder>;
  if (!res.ok || !json.ok) throw new Error(json.message || json.error || "Failed to load purchase orders");
  return json.items ?? [];
}

export function PurchaseOrdersClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSuppliers()
      .then((items) => {
        setSuppliers(items);
        if (!selectedSupplierId && items.length) setSelectedSupplierId("");
      })
      .catch((err) => toast(err?.message || "Не удалось загрузить поставщиков", { variant: "error" }));
  }, [selectedSupplierId]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.trim().toLowerCase();
    return orders.filter(
      (po) =>
        po.id.toLowerCase().includes(q) ||
        (po.suppliers?.name?.toLowerCase().includes(q) ?? false) ||
        (po.suppliers?.code?.toLowerCase().includes(q) ?? false),
    );
  }, [orders, search]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPurchaseOrders({
        supplierId: selectedSupplierId || undefined,
        status: status === "all" ? undefined : status,
        limit: 200,
      });
      setOrders(data);
    } catch (err: any) {
      toast(err?.message || "Не удалось загрузить PO", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedSupplierId, status]);

  useEffect(() => {
    loadOrders().catch(() => undefined);
  }, [loadOrders]);

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
            <select
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All" : s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-semibold text-admin-text">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="PO id or supplier"
              className="bg-white"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="neutral" onClick={loadOrders} disabled={loading}>
            Refresh
          </Button>
        </div>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Purchase Orders</h2>
            <p className="text-sm text-admin-textSoft">
              Showing {filteredOrders.length} of {orders.length}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-sm text-admin-textSoft">Loading purchase orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="py-6 text-sm text-admin-textSoft">No purchase orders.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[960px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">PO</th>
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Error</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((po) => {
                  const style = STATUS_STYLES[po.status] ?? "bg-slate-200 text-slate-700";
                  return (
                    <tr key={po.id} className="border-t border-admin-border">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-admin-text">{po.id}</div>
                        <div className="text-xs text-admin-textSoft">{po.status}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-admin-text">{po.suppliers?.name ?? po.supplier_id}</div>
                        <div className="text-xs text-admin-textSoft">{po.suppliers?.code ?? ""}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", style)}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-rose-600">{po.error_message ?? ""}</td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {formatMoney(po.total_cost_cents, po.currency)}
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDate(po.created_at)}</td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDate(po.updated_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end">
                          <Link href={`/admin/purchase-orders/${po.id}`}>
                            <Button variant="neutral" className="px-3 py-2 text-sm">
                              View
                            </Button>
                          </Link>
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
