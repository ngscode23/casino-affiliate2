"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { toast } from "@ui/components/common/toast";
import { AdminStack, AdminSurface } from "@/components/admin/layout";

type RmaRequest = {
  id: string;
  order_id: string;
  status: string;
  reason: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ApiList<T> = { ok?: boolean; items?: T[]; item?: T; error?: string; message?: string };

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  received: "bg-sky-100 text-sky-700",
  refunded: "bg-indigo-100 text-indigo-700",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function fetchRma(status?: string) {
  const url = new URL("/api/admin/rma-requests", window.location.origin);
  if (status && status !== "all") url.searchParams.set("status", status);
  url.searchParams.set("limit", "200");
  const res = await fetch(url.toString(), { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as ApiList<RmaRequest>;
  if (!res.ok || !json.ok) throw new Error(json.message || json.error || "Failed to load RMA");
  return json.items ?? [];
}

async function updateRma(id: string, payload: Partial<RmaRequest>) {
  const res = await fetch(`/api/admin/rma-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as ApiList<RmaRequest>;
  if (!res.ok || !json.ok || !json.item) throw new Error(json.message || json.error || "Failed to update RMA");
  return json.item;
}

export function RmaRequestsClient() {
  const [items, setItems] = useState<RmaRequest[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editStatus, setEditStatus] = useState("approved");

  useEffect(() => {
    setLoading(true);
    fetchRma(status)
      .then(setItems)
      .catch((err) => toast(err?.message || "Не удалось загрузить RMA", { variant: "error" }))
      .finally(() => setLoading(false));
  }, [status]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((it) => it.order_id.toLowerCase().includes(q) || it.id.toLowerCase().includes(q));
  }, [items, search]);

  const startEdit = (item: RmaRequest) => {
    setUpdatingId(item.id);
    setEditNote(item.notes ?? "");
    setEditStatus(item.status || "approved");
  };

  const saveEdit = async () => {
    if (!updatingId) return;
    try {
      const updated = await updateRma(updatingId, {
        status: editStatus,
        notes: editNote,
      });
      setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      toast("RMA обновлена", { variant: "success" });
    } catch (err: any) {
      toast(err?.message || "Не удалось сохранить", { variant: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Status</label>
            <select
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="requested">requested</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="received">received</option>
              <option value="refunded">refunded</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-semibold text-admin-text">Search</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order id or RMA id" className="bg-white" />
          </div>
        </div>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Requests</h2>
            <p className="text-sm text-admin-textSoft">
              Showing {filtered.length} of {items.length}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="py-4 text-sm text-admin-textSoft">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-sm text-admin-textSoft">No requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[960px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">RMA</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Customer note</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const badge = STATUS_COLORS[item.status] ?? "bg-slate-200 text-slate-700";
                  return (
                    <tr key={item.id} className="border-t border-admin-border align-top">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-admin-text">{item.id}</div>
                        <div className="text-xs text-admin-textSoft">{formatDate(item.created_at)}</div>
                      </td>
                      <td className="px-3 py-3 text-admin-text">{item.order_id}</td>
                      <td className="px-3 py-3">
                        <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", badge)}>{item.status}</span>
                      </td>
                      <td className="px-3 py-3 text-admin-text">{item.reason ?? "-"}</td>
                      <td className="px-3 py-3 text-admin-textSoft whitespace-pre-line">{item.notes ?? "-"}</td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDate(item.updated_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end">
                          <Button variant="neutral" className="px-3 py-2 text-sm" onClick={() => startEdit(item)}>
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

      {updatingId ? (
        <AdminSurface>
          <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
            <div>
              <h2 className="text-lg font-semibold text-admin-text">Update RMA</h2>
              <p className="text-sm text-admin-textSoft">RMA ID: {updatingId}</p>
            </div>
            <Button variant="soft" onClick={() => setUpdatingId(null)}>
              Close
            </Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Status</label>
              <select
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="approved">approved</option>
                <option value="requested">requested</option>
                <option value="rejected">rejected</option>
                <option value="received">received</option>
                <option value="refunded">refunded</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Admin note</label>
            <textarea
              rows={3}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={saveEdit}>Save</Button>
            <Button variant="soft" onClick={() => setUpdatingId(null)}>
              Cancel
            </Button>
          </div>
        </AdminSurface>
      ) : null}
    </AdminStack>
  );
}
