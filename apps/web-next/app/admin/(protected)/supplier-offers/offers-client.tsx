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

type SupplierOffer = {
  id: string;
  supplier_id: string;
  sku_id: string;
  supplier_sku_id?: string | null;
  price_cents: number | null;
  currency: string | null;
  cost_cents: number | null;
  lead_time_days: number | null;
  min_order_qty: number | null;
  max_order_qty: number | null;
  valid_from: string | null;
  valid_to: string | null;
  status: string | null;
  updated_at?: string | null;
  suppliers?: Supplier | null;
  ecom_products?: EcomProduct | null;
  supplier_skus?: SupplierSku | null;
};

type ApiList<T> = { ok?: boolean; items?: T[]; error?: string; message?: string };

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  expired: "bg-slate-200 text-slate-700",
};

const STATUSES = ["all", "active", "paused", "expired"] as const;

function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null) return "-";
  const ccy = currency || "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(value / 100);
  } catch {
    return `${value / 100} ${ccy}`;
  }
}

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

async function fetchOffers(params: { supplierId?: string; status?: string; q?: string; limit?: number }) {
  const url = new URL("/api/admin/supplier-offers", window.location.origin);
  if (params.supplierId) url.searchParams.set("supplier_id", params.supplierId);
  if (params.status && params.status !== "all") url.searchParams.set("status", params.status);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  const res = await fetch(url.toString(), { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as ApiList<SupplierOffer>;
  if (!res.ok || !json.ok) throw new Error(json.message || json.error || "Failed to load offers");
  return json.items ?? [];
}

export function SupplierOffersClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [search, setSearch] = useState("");
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers()
      .then((items) => setSuppliers(items))
      .catch((err) => toast(err?.message || "Failed to load suppliers", { variant: "error" }));
  }, []);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOffers({
        supplierId: selectedSupplierId || undefined,
        status: status === "all" ? undefined : status,
        q: search.trim() || undefined,
        limit: 200,
      });
      setOffers(data);
    } catch (err: any) {
      toast(err?.message || "Failed to load offers", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedSupplierId, status, search]);

  useEffect(() => {
    loadOffers().catch(() => undefined);
  }, [loadOffers]);

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
              placeholder="SKU, slug, or title"
              className="bg-white"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="neutral" onClick={loadOffers} disabled={loading}>
            Refresh
          </Button>
        </div>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Offers</h2>
            <p className="text-sm text-admin-textSoft">Total: {offers.length}</p>
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-sm text-admin-textSoft">Loading offers...</p>
        ) : offers.length === 0 ? (
          <p className="py-6 text-sm text-admin-textSoft">No offers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2">Supplier SKU</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Lead time</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Valid to</th>
                  <th className="px-3 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => {
                  const status = (offer.status || "").toLowerCase();
                  const style = STATUS_STYLES[status] ?? "bg-slate-200 text-slate-700";
                  const product = offer.ecom_products;
                  return (
                    <tr key={offer.id} className="border-t border-admin-border">
                      <td className="px-3 py-3">
                        <div className="font-medium text-admin-text">{product?.title ?? offer.sku_id}</div>
                        <div className="text-xs text-admin-textSoft">{product?.sku || product?.slug || "-"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-admin-text">{offer.suppliers?.name ?? offer.supplier_id}</div>
                        <div className="text-xs text-admin-textSoft">{offer.suppliers?.code ?? ""}</div>
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {offer.supplier_skus?.supplier_sku ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {formatMoney(offer.price_cents, offer.currency)}
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {formatMoney(offer.cost_cents, offer.currency)}
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {offer.lead_time_days != null ? `${offer.lead_time_days} days` : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", style)}>
                          {status || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDate(offer.valid_to)}</td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDate(offer.updated_at)}</td>
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
