"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { toast } from "@ui/components/common/toast";
import { AdminStack, AdminSurface } from "@/components/admin/layout";

type Shipment = {
  id: string;
  order_id: string;
  purchase_order_id: string;
  status: string;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  eta: string | null;
  last_event_at?: string | null;
  created_at?: string | null;
  notification_email?: string | null;
};

type ApiList<T> = { ok?: boolean; items?: T[]; item?: T; error?: string; message?: string };

const STATUS_OPTIONS = ["pending", "in_transit", "delivered", "exception", "returned"] as const;
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_transit: "bg-sky-100 text-sky-700",
  delivered: "bg-emerald-100 text-emerald-700",
  exception: "bg-amber-100 text-amber-700",
  returned: "bg-rose-100 text-rose-700",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function fetchShipments(params: { status?: string; limit?: number; orderId?: string }) {
  const url = new URL("/api/admin/shipments", window.location.origin);
  if (params.status && params.status !== "all") url.searchParams.set("status", params.status);
  if (params.orderId) url.searchParams.set("order_id", params.orderId);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  const res = await fetch(url.toString(), { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as ApiList<Shipment>;
  if (!res.ok || !json.ok) throw new Error(json.message || json.error || "Failed to load shipments");
  return json.items ?? [];
}

async function saveShipment(payload: Partial<Shipment>) {
  const res = await fetch("/api/admin/shipments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as ApiList<Shipment>;
  if (!res.ok || !json.ok || !json.item) throw new Error(json.message || json.error || "Failed to save shipment");
  return json.item;
}

export function ShipmentsClient() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<Partial<Shipment>>({ status: "pending" });
  const [saving, setSaving] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return shipments;
    const q = search.trim().toLowerCase();
    return shipments.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.order_id.toLowerCase().includes(q) ||
        (s.tracking_number ?? "").toLowerCase().includes(q) ||
        (s.purchase_order_id ?? "").toLowerCase().includes(q),
    );
  }, [shipments, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchShipments({
        status,
        orderId: orderIdFilter.trim() || undefined,
        limit: 200,
      });
      setShipments(data);
    } catch (err: any) {
      toast(err?.message || "Не удалось загрузить shipments", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [status, orderIdFilter]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const handleSave = async () => {
    if (!editing.order_id) {
      toast("order_id обязателен", { variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveShipment({ ...editing, notification_email: notificationEmail.trim() || undefined });
      setEditing({ status: editing.status || "pending" });
      setNotificationEmail("");
      setShipments((prev) => {
        const existingIdx = prev.findIndex((row) => row.id === saved.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      toast("Shipment сохранён", { variant: "success" });
    } catch (err: any) {
      toast(err?.message || "Не удалось сохранить", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: Shipment) => {
    setEditing({
      id: row.id,
      order_id: row.order_id,
      purchase_order_id: row.purchase_order_id,
      status: row.status,
      carrier: row.carrier,
      tracking_number: row.tracking_number,
      tracking_url: row.tracking_url,
      eta: row.eta,
      shipped_at: row.shipped_at,
      delivered_at: row.delivered_at,
    });
    setNotificationEmail(row.notification_email ?? "");
  };

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <div className="grid gap-4 md:grid-cols-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Status</label>
            <select
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Order ID</label>
            <Input value={orderIdFilter} onChange={(e) => setOrderIdFilter(e.target.value)} placeholder="order_id" className="bg-white" />
          </div>
          <div className="flex flex-col gap-2 md:col-span-3">
            <label className="text-sm font-semibold text-admin-text">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Shipment id / PO id / tracking number"
              className="bg-white"
            />
          </div>
        </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="neutral" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button
              variant="soft"
              onClick={async () => {
                try {
                  const res = await fetch("/api/admin/email-outbox/process", {
                    method: "POST",
                    headers: { "x-cron-secret": (process.env.NEXT_PUBLIC_CRON_SECRET as string) || "" },
                  });
                  const json = await res.json();
                  toast(res.ok ? `Email outbox processed (sent ${json.sent ?? 0})` : json.message || "Process failed", {
                    variant: res.ok ? "success" : "error",
                  });
                } catch (err: any) {
                  toast(err?.message || "Process failed", { variant: "error" });
                }
              }}
            >
              Process emails
            </Button>
          </div>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Create / Update</h2>
            <p className="text-sm text-admin-textSoft">Upsert by id or tracking_number.</p>
          </div>
          {editing.id ? (
            <Button variant="soft" onClick={() => setEditing({ status: "pending" })}>
              New
            </Button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Order ID *</label>
            <Input value={editing.order_id ?? ""} onChange={(e) => setEditing((s) => ({ ...s, order_id: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Purchase Order ID</label>
            <Input
              value={editing.purchase_order_id ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s, purchase_order_id: e.target.value || undefined }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Status</label>
            <select
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={editing.status || "pending"}
              onChange={(e) => setEditing((s) => ({ ...s, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Carrier</label>
            <Input value={editing.carrier ?? ""} onChange={(e) => setEditing((s) => ({ ...s, carrier: e.target.value || null }))} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Tracking number</label>
            <Input
              value={editing.tracking_number ?? ""}
              onChange={(e) => setEditing((s) => ({ ...s, tracking_number: e.target.value || null }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Tracking URL</label>
            <Input
              value={editing.tracking_url ?? ""}
              onChange={(e) => setEditing((s) => ({ ...s, tracking_url: e.target.value || null }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">ETA (ISO)</label>
            <Input value={editing.eta ?? ""} onChange={(e) => setEditing((s) => ({ ...s, eta: e.target.value || null }))} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Shipped at (ISO)</label>
            <Input value={editing.shipped_at ?? ""} onChange={(e) => setEditing((s) => ({ ...s, shipped_at: e.target.value || null }))} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Delivered at (ISO)</label>
            <Input
              value={editing.delivered_at ?? ""}
              onChange={(e) => setEditing((s) => ({ ...s, delivered_at: e.target.value || null }))}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Notification email (override)</label>
            <Input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="customer@example.com"
              className="bg-white"
            />
            <p className="text-xs text-admin-textSoft">Если у заказа нет email, можно указать здесь.</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={handleSave} disabled={saving}>
            Save
          </Button>
          {editing.id ? (
            <Button variant="soft" onClick={() => setEditing({ status: "pending" })} disabled={saving}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Shipments</h2>
            <p className="text-sm text-admin-textSoft">
              Showing {filtered.length} of {shipments.length}
            </p>
          </div>
        </div>
        {loading ? (
          <p className="py-4 text-sm text-admin-textSoft">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-sm text-admin-textSoft">No shipments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[960px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">Shipment</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">PO</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Tracking</th>
                  <th className="px-3 py-2">ETA</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const style = STATUS_STYLES[s.status] ?? "bg-slate-200 text-slate-700";
                  return (
                    <tr key={s.id} className="border-t border-admin-border">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-admin-text">{s.id}</div>
                        <div className="text-xs text-admin-textSoft">{formatDate(s.created_at ?? undefined)}</div>
                      </td>
                      <td className="px-3 py-3 text-admin-text">{s.order_id}</td>
                      <td className="px-3 py-3 text-admin-textSubtle">{s.purchase_order_id ?? "-"}</td>
                      <td className="px-3 py-3">
                        <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", style)}>{s.status}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-admin-text">{s.tracking_number ?? "-"}</div>
                        <div className="text-xs text-admin-textSoft">{s.carrier ?? ""}</div>
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDate(s.eta)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="neutral" className="px-3 py-2 text-sm" onClick={() => startEdit(s)}>
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
