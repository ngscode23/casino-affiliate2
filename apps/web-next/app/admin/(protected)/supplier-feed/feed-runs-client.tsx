"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { toast } from "@ui/components/common/toast";
import { AdminStack, AdminSurface } from "@/components/admin/layout";

type Supplier = {
  id: string;
  name: string;
  code: string;
  default_currency?: string | null;
};

type FeedRun = {
  id: string;
  supplier_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  stats?: Record<string, unknown> | null;
  suppliers?: Supplier | null;
};

type ApiList<T> = { ok?: boolean; items?: T[]; error?: string; message?: string };
type ApiResult<T> = { ok?: boolean; item?: T; stats?: Record<string, unknown>; error?: string; message?: string };

const STATUS_COLORS: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  running: "bg-amber-100 text-amber-700",
  failed: "bg-rose-100 text-rose-700",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatDuration(started?: string | null, finished?: string | null) {
  if (!started || !finished) return "—";
  const s = new Date(started).getTime();
  const f = new Date(finished).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(f) || f <= s) return "—";
  const seconds = Math.round((f - s) / 1000);
  if (seconds < 90) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch("/api/admin/suppliers", { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as ApiList<Supplier>;
  if (!res.ok || !json.ok) throw new Error(json.message || json.error || "Failed to load suppliers.");
  return json.items ?? [];
}

async function fetchRuns(params: { supplierId?: string; status?: string; limit?: number }) {
  const url = new URL("/api/admin/supplier-feed/runs", window.location.origin);
  if (params.supplierId) url.searchParams.set("supplier_id", params.supplierId);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  const res = await fetch(url.toString(), { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as ApiList<FeedRun>;
  if (!res.ok || !json.ok) throw new Error(json.message || json.error || "Failed to load feed runs.");
  return json.items ?? [];
}

async function runImport({
  supplierId,
  missThreshold,
  file,
  text,
}: {
  supplierId: string;
  missThreshold: number;
  file: File | null;
  text: string;
}) {
  if (file) {
    const form = new FormData();
    form.append("supplier_id", supplierId);
    form.append("miss_threshold", String(missThreshold));
    form.append("file", file);
    const res = await fetch("/api/admin/supplier-feed/import", { method: "POST", body: form, credentials: "include" });
    const json = (await res.json().catch(() => ({}))) as ApiResult<unknown>;
    if (!res.ok || !json.ok) throw new Error(json.message || json.error || "Import failed.");
    return json;
  }

  let items: unknown = [];
  if (text.trim()) {
    try {
      items = JSON.parse(text);
    } catch {
      throw new Error("Не удалось распарсить JSON.");
    }
  }

  const res = await fetch("/api/admin/supplier-feed/import", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supplier_id: supplierId,
      miss_threshold: missThreshold,
      items,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as ApiResult<unknown>;
  if (!res.ok || !json.ok) throw new Error(json.message || json.error || "Import failed.");
  return json;
}

export function FeedRunsClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [runs, setRuns] = useState<FeedRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [missThreshold, setMissThreshold] = useState(3);
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState("");

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
    [suppliers],
  );

  useEffect(() => {
    fetchSuppliers()
      .then((items) => {
        setSuppliers(items);
        if (!selectedSupplierId && items.length) setSelectedSupplierId(items[0].id);
      })
      .catch((err) => toast(err?.message || "Не удалось загрузить поставщиков", { variant: "error" }));
  }, [selectedSupplierId]);

  const loadRuns = useCallback(async () => {
    if (!selectedSupplierId) return;
    setLoading(true);
    try {
      const data = await fetchRuns({ supplierId: selectedSupplierId, limit: 200 });
      setRuns(data);
    } catch (err: any) {
      toast(err?.message || "Не удалось загрузить прогоны", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedSupplierId]);

  useEffect(() => {
    loadRuns().catch(() => undefined);
  }, [loadRuns]);

  const handleRunImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSupplierId) {
      toast("Выберите поставщика", { variant: "error" });
      return;
    }
    if (importing) return;
    if (!file && !jsonText.trim()) {
      toast("Добавьте файл или JSON", { variant: "error" });
      return;
    }

    setImporting(true);
    try {
      const result = await runImport({
        supplierId: selectedSupplierId,
        missThreshold: Number.isFinite(missThreshold) ? missThreshold : 3,
        file,
        text: jsonText,
      });
      toast("Импорт запущен", { variant: "success" });
      setFile(null);
      setJsonText("");
      await loadRuns();
      return result;
    } catch (err: any) {
      toast(err?.message || "Импорт не удался", { variant: "error" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <form className="space-y-4" onSubmit={handleRunImport}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Supplier</label>
              <select
                className="rounded-xl border border-admin-border bg-white px-4 py-2 text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
              >
                {supplierOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">Miss threshold</label>
              <Input
                type="number"
                min={1}
                value={missThreshold}
                onChange={(e) => setMissThreshold(Number(e.target.value) || 0)}
                className="bg-white"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-admin-text">CSV file</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="rounded-xl border border-admin-border bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-admin-text">JSON items (optional)</label>
            <textarea
              className="min-h-[140px] rounded-xl border border-admin-border bg-white px-4 py-3 text-sm text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              placeholder='[{"sku_id":"...", "supplier_sku":"...", "price_cents":12000, "currency":"USD"}]'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
            <p className="text-xs text-admin-textSoft">Если указан файл, JSON поле игнорируется.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={importing}>
              {importing ? "Running..." : "Run import"}
            </Button>
            <Button
              type="button"
              variant="neutral"
              onClick={() => {
                setFile(null);
                setJsonText("");
              }}
              disabled={importing}
            >
              Clear
            </Button>
          </div>
        </form>
      </AdminSurface>

      <AdminSurface>
        <div className="flex items-center justify-between gap-4 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-semibold text-admin-text">Feed runs</h2>
            <p className="text-sm text-admin-textSoft">
              {selectedSupplierId ? "For selected supplier" : "Select supplier to view runs"}
            </p>
          </div>
          <Button variant="neutral" onClick={loadRuns} disabled={loading || !selectedSupplierId}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <p className="py-6 text-sm text-admin-textSoft">Loading runs...</p>
        ) : runs.length === 0 ? (
          <p className="py-6 text-sm text-admin-textSoft">No runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[880px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-admin-textSubtle">
                  <th className="px-3 py-2">Run</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Finished</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Stats</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const supplier = run.suppliers;
                  const stats = run.stats || {};
                  const statusClass = STATUS_COLORS[run.status] ?? "bg-slate-200 text-slate-700";
                  return (
                    <tr key={run.id} className="border-t border-admin-border">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-admin-text">{supplier?.name ?? run.supplier_id}</div>
                        <div className="text-xs text-admin-textSoft">
                          {supplier?.code ? `${supplier.code} · ${run.id}` : run.id}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", statusClass)}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDate(run.started_at)}</td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDate(run.finished_at)}</td>
                      <td className="px-3 py-3 text-admin-textSubtle">{formatDuration(run.started_at, run.finished_at)}</td>
                      <td className="px-3 py-3 text-admin-textSubtle">
                        {["received", "parsed", "failed", "upserted", "disabled"].map((key) => {
                          const value = (stats as any)?.[key];
                          if (value == null) return null;
                          return (
                            <div key={key} className="text-xs">
                              {key}: {String(value)}
                            </div>
                          );
                        })}
                      </td>
                      <td className="px-3 py-3 text-xs text-rose-600">{run.error ?? ""}</td>
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
