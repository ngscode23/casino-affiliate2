"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";
import { AdminStack, AdminSurface } from "@/components/admin/layout";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "inactive", label: "Inactive" },
];

type SupplierRecord = {
  id: string;
  code: string;
  name: string;
  status: string | null;
  default_currency: string | null;
  contact_email: string | null;
  api_base_url: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ApiListResponse = {
  ok?: boolean;
  items?: SupplierRecord[];
  error?: string;
  message?: string;
};

type ApiMutationResponse = {
  ok?: boolean;
  item?: SupplierRecord;
  deleted?: boolean;
  error?: string;
  message?: string;
};

type FormState = {
  id: string | null;
  code: string;
  name: string;
  status: string;
  defaultCurrency: string;
  contactEmail: string;
  apiBaseUrl: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  code: "",
  name: "",
  status: "active",
  defaultCurrency: "USD",
  contactEmail: "",
  apiBaseUrl: "",
};

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function fetchSuppliers(): Promise<SupplierRecord[]> {
  const response = await fetch("/api/admin/suppliers", { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to load suppliers.");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function createSupplier(payload: Partial<SupplierRecord>) {
  const response = await fetch("/api/admin/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse;
  if (!response.ok || !result.ok || !result.item) {
    throw new Error(result.message || result.error || "Failed to create supplier.");
  }
  return result.item;
}

async function updateSupplier(id: string, payload: Partial<SupplierRecord>) {
  const response = await fetch(`/api/admin/suppliers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse;
  if (!response.ok || !result.ok || !result.item) {
    throw new Error(result.message || result.error || "Failed to update supplier.");
  }
  return result.item;
}

async function deleteSupplier(id: string) {
  const response = await fetch(`/api/admin/suppliers/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const result = (await response.json().catch(() => ({}))) as ApiMutationResponse;
  if (!response.ok || !result.ok) {
    throw new Error(result.message || result.error || "Failed to delete supplier.");
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function SuppliersClient() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const editMode = Boolean(form.id);

  const sortedSuppliers = useMemo(() => {
    return [...suppliers].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [suppliers]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
  }, []);

  const startEdit = useCallback((record: SupplierRecord) => {
    setForm({
      id: record.id,
      code: record.code,
      name: record.name,
      status: record.status ?? "active",
      defaultCurrency: record.default_currency ?? "USD",
      contactEmail: record.contact_email ?? "",
      apiBaseUrl: record.api_base_url ?? "",
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Failed to load suppliers.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const name = form.name.trim();
    if (!name) {
      toast("Supplier name is required.", { variant: "error" });
      return;
    }

    const code = (form.code.trim() || slugify(name)).toLowerCase();
    if (!code) {
      toast("Supplier code is required.", { variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code,
        name,
        status: form.status,
        default_currency: form.defaultCurrency.trim() || "USD",
        contact_email: form.contactEmail.trim() || null,
        api_base_url: form.apiBaseUrl.trim() || null,
      } satisfies Partial<SupplierRecord>;

      const saved = form.id
        ? await updateSupplier(form.id, payload)
        : await createSupplier(payload);

      setSuppliers((prev) => {
        const next = prev.filter((item) => item.id !== saved.id);
        next.push(saved);
        return next;
      });

      toast(editMode ? "Supplier updated." : "Supplier created.", { variant: "success" });
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Failed to save supplier.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: SupplierRecord) => {
    const confirmed = window.confirm(`Deactivate supplier "${record.name}"?`);
    if (!confirmed) return;
    setDeletingId(record.id);
    try {
      await deleteSupplier(record.id);
      setSuppliers((prev) => prev.filter((item) => item.id !== record.id));
      if (form.id === record.id) resetForm();
      toast("Supplier deactivated.", { variant: "success" });
    } catch (error: any) {
      console.error(error);
      toast(error?.message || "Failed to deactivate supplier.", { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateCode = () => {
    if (!form.name.trim()) return;
    setForm((prev) => ({ ...prev, code: slugify(prev.name) }));
  };

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Name</label>
            <input
              type="text"
              className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                  code: prev.id ? prev.code : prev.code || slugify(event.target.value),
                }))
              }
              placeholder="Acme Supplies"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">Code</label>
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                className="flex-1 rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="default"
              />
              <Button type="button" variant="neutral" onClick={handleGenerateCode}>
                Generate
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Status</label>
              <select
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Default currency</label>
              <input
                type="text"
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.defaultCurrency}
                onChange={(event) => setForm((prev) => ({ ...prev, defaultCurrency: event.target.value.toUpperCase() }))}
                placeholder="USD"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Contact email</label>
              <input
                type="email"
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.contactEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                placeholder="ops@example.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">API base URL</label>
              <input
                type="url"
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={form.apiBaseUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, apiBaseUrl: event.target.value }))}
                placeholder="https://vendor.example.com/api"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editMode ? "Update supplier" : "Create supplier"}
            </Button>
            <Button type="button" variant="soft" onClick={resetForm} disabled={saving}>
              {editMode ? "Cancel" : "Clear"}
            </Button>
          </div>
        </form>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Suppliers</h2>
            <p className="text-sm text-admin-textSoft">Total: {suppliers.length}</p>
          </div>
          <Button variant="neutral" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <p className="py-6 text-sm text-admin-textSoft">Loading suppliers...</p>
        ) : sortedSuppliers.length === 0 ? (
          <p className="py-6 text-sm text-admin-textSoft">No suppliers created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Currency</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-t border-admin-border">
                    <td className="px-3 py-3">
                      <div className="font-medium text-admin-text">{supplier.name}</div>
                      <div className="text-xs text-admin-textSoft">{supplier.id}</div>
                    </td>
                    <td className="px-3 py-3 text-admin-textSubtle">{supplier.code}</td>
                    <td className="px-3 py-3">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                          supplier.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : supplier.status === "paused"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-200 text-slate-600",
                        )}
                      >
                        {supplier.status ?? "inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-admin-textSubtle">
                      {supplier.default_currency ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-admin-textSubtle">
                      {formatDate(supplier.updated_at ?? supplier.created_at ?? null)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="neutral"
                          onClick={() => startEdit(supplier)}
                          className="min-h-[36px] px-3 py-2 text-sm"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="soft"
                          className={clsx(
                            "min-h-[36px] px-3 py-2 text-sm text-rose-600",
                            deletingId === supplier.id && "opacity-60",
                          )}
                          disabled={deletingId === supplier.id}
                          onClick={() => handleDelete(supplier)}
                        >
                          {deletingId === supplier.id ? "Deactivating..." : "Deactivate"}
                        </Button>
                      </div>
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
