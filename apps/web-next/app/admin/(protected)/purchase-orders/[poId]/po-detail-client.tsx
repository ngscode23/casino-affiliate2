"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";
import { AdminStack, AdminSurface } from "@/components/admin/layout";

type Supplier = { id: string; name: string; code: string };

type PoItem = {
  id: string;
  sku_id: string;
  qty: number;
  cost_cents: number | null;
  currency: string | null;
  supplier_sku_snapshot: string | null;
  title_snapshot: string | null;
  ecom_products?: { id: string; title: string; sku?: string | null; slug?: string | null; currency?: string | null } | null;
};

type PurchaseOrder = {
  id: string;
  order_id: string | null;
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
  purchase_order_items?: PoItem[];
};

type ApiResult = { ok?: boolean; item?: PurchaseOrder; error?: string; message?: string };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  sent: "bg-sky-100 text-sky-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  shipped: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-200 text-slate-700",
};

const STATUS_OPTIONS = ["pending", "sent", "confirmed", "shipped", "failed", "cancelled"] as const;

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
  return date.toLocaleString();
}

async function fetchPo(id: string): Promise<PurchaseOrder> {
  const res = await fetch(`/api/admin/purchase-orders/${id}`, { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as ApiResult;
  if (!res.ok || !json.ok || !json.item) throw new Error(json.message || json.error || "Failed to load PO");
  return json.item;
}

async function updateStatus(id: string, status: string) {
  const res = await fetch(`/api/admin/purchase-orders/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const json = (await res.json().catch(() => ({}))) as ApiResult;
  if (!res.ok || !json.ok || !json.item) throw new Error(json.message || json.error || "Failed to update status");
  return json.item;
}

export function PurchaseOrderDetailClient({ poId }: { poId: string }) {
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPo(poId)
      .then(setPo)
      .catch((err) => toast(err?.message || "Не удалось загрузить PO", { variant: "error" }))
      .finally(() => setLoading(false));
  }, [poId]);

  const items = useMemo(() => po?.purchase_order_items ?? [], [po]);

  const handleStatusChange = async (status: string) => {
    if (!po) return;
    setUpdating(true);
    try {
      const updated = await updateStatus(po.id, status);
      setPo(updated);
      toast("Статус обновлён", { variant: "success" });
    } catch (err: any) {
      toast(err?.message || "Не удалось обновить статус", { variant: "error" });
    } finally {
      setUpdating(false);
    }
  };

  const handleExport = async () => {
    if (!po) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/purchase-orders/${po.id}/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `purchase-order-${po.id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast(err?.message || "Export failed", { variant: "error" });
    } finally {
      setExporting(false);
    }
  };

  if (loading || !po) {
    return (
      <AdminSurface>
        <p className="text-sm text-admin-textSoft">Loading...</p>
      </AdminSurface>
    );
  }

  const statusStyle = STATUS_STYLES[po.status] ?? "bg-slate-200 text-slate-700";

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">PO {po.id}</h2>
            <p className="text-sm text-admin-textSoft">
              Supplier: {po.suppliers?.name ?? po.supplier_id} {po.suppliers?.code ? `(${po.suppliers.code})` : ""}
            </p>
            {po.order_id ? <p className="text-sm text-admin-textSoft">Order: {po.order_id}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="neutral" onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
            <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", statusStyle)}>
              {po.status}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Stat label="Total cost" value={formatMoney(po.total_cost_cents, po.currency)} />
          <Stat label="Sent at" value={formatDate(po.sent_at)} />
          <Stat label="Confirmed at" value={formatDate(po.confirmed_at)} />
          <Stat label="Shipped at" value={formatDate(po.shipped_at)} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <Button
              key={s}
              variant={po.status === s ? "primary" : "soft"}
              disabled={updating}
              onClick={() => handleStatusChange(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        {po.error_message ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Error: {po.error_message}
          </div>
        ) : null}
      </AdminSurface>

      <AdminSurface>
        <h3 className="text-base font-semibold text-admin-text">Items</h3>
        {items.length === 0 ? (
          <p className="py-4 text-sm text-admin-textSoft">No items.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Supplier SKU</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-admin-border">
                    <td className="px-3 py-3">
                      <div className="font-medium text-admin-text">
                        {item.title_snapshot || item.ecom_products?.title || item.sku_id}
                      </div>
                      <div className="text-xs text-admin-textSoft">
                        {item.ecom_products?.sku || item.ecom_products?.slug || item.sku_id}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-admin-textSubtle">{item.supplier_sku_snapshot ?? "—"}</td>
                    <td className="px-3 py-3 text-admin-textSubtle">{item.qty}</td>
                    <td className="px-3 py-3 text-admin-textSubtle">
                      {formatMoney(item.cost_cents, item.currency ?? po.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurface>
    </AdminStack>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surfaceMuted px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-admin-textSubtle">{label}</div>
      <div className="text-sm font-semibold text-admin-text">{value}</div>
    </div>
  );
}
