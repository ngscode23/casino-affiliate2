"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { toast } from "@ui/components/common/toast";
import { AdminSectionHeading, AdminSurface, AdminStack } from "@/components/admin/layout";

type SupplierRecord = {
  id: string;
  name?: string | null;
  code?: string | null;
};

type QueueItem = {
  id: string;
  supplier_id: string;
  supplier_name?: string | null;
  supplier_code?: string | null;
  vendor_sku: string;
  status: string;
  reason?: string | null;
  sku_id?: string | null;
  candidate_skus?: string[] | null;
  payload_snapshot?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CatalogSearchItem = {
  id: string;
  title: string;
  slug: string;
};

type ApiListResponse<T> = {
  ok?: boolean;
  items?: T[];
  error?: string;
  message?: string;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

async function fetchSuppliers(): Promise<SupplierRecord[]> {
  const response = await fetch("/api/admin/suppliers", { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse<SupplierRecord>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to load suppliers.");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function fetchQueue(params: { supplierId?: string; status?: string; limit?: number }) {
  const url = new URL("/api/admin/automation/queue", window.location.origin);
  if (params.supplierId) url.searchParams.set("supplier_id", params.supplierId);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse<QueueItem>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to load queue.");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function runAutomation(params: {
  supplierId?: string;
  limit?: number;
  seed?: boolean;
  autoCreate?: boolean;
}) {
  const response = await fetch("/api/admin/automation/run", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supplier_id: params.supplierId || undefined,
      limit: params.limit ?? 50,
      seed_unmapped: Boolean(params.seed),
      auto_create: Boolean(params.autoCreate),
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Automation run failed.");
  }
  return payload;
}

async function resolveQueueItem(params: { id: string; skuId?: string; action: "link" | "skip" }) {
  const response = await fetch("/api/admin/automation/resolve", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: params.id,
      sku_id: params.skuId,
      action: params.action,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Resolve failed.");
  }
}

async function searchSkus(query: string): Promise<CatalogSearchItem[]> {
  const url = new URL("/api/admin/shop/products", window.location.origin);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "20");
  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = (await response.json().catch(() => ({}))) as ApiListResponse<CatalogSearchItem>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || payload.error || "Failed to search SKUs.");
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

export function AutomationClient() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [limit, setLimit] = useState(50);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [running, setRunning] = useState(false);
  const [searchQueryById, setSearchQueryById] = useState<Record<string, string>>({});
  const [searchResultsById, setSearchResultsById] = useState<Record<string, CatalogSearchItem[]>>({});
  const [searchingById, setSearchingById] = useState<Record<string, boolean>>({});

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null,
    [suppliers, selectedSupplierId],
  );

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
      if (data.length) {
        setSelectedSupplierId((prev) => prev || data[0].id);
      }
    } catch (error: any) {
      toast(error?.message || "Failed to load suppliers.", { variant: "error" });
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const items = await fetchQueue({
        supplierId: selectedSupplierId || undefined,
        status: statusFilter || undefined,
        limit,
      });
      setQueue(items);
    } catch (error: any) {
      toast(error?.message || "Failed to load queue.", { variant: "error" });
    } finally {
      setLoadingQueue(false);
    }
  }, [selectedSupplierId, statusFilter, limit]);

  const handleRun = useCallback(
    async (seed: boolean, autoCreate: boolean) => {
      setRunning(true);
      try {
        await runAutomation({
          supplierId: selectedSupplierId || undefined,
          limit,
          seed,
          autoCreate,
        });
        toast("Automation run completed.", { variant: "success" });
        loadQueue();
      } catch (error: any) {
        toast(error?.message || "Automation run failed.", { variant: "error" });
      } finally {
        setRunning(false);
      }
    },
    [selectedSupplierId, limit, loadQueue],
  );

  const handleSearchSku = useCallback(async (item: QueueItem, query: string) => {
    const normalized = normalizeString(query);
    if (!normalized) {
      setSearchResultsById((prev) => ({ ...prev, [item.id]: [] }));
      return;
    }
    setSearchingById((prev) => ({ ...prev, [item.id]: true }));
    try {
      const items = await searchSkus(normalized);
      setSearchResultsById((prev) => ({ ...prev, [item.id]: items }));
    } catch (error: any) {
      toast(error?.message || "Search failed.", { variant: "error" });
    } finally {
      setSearchingById((prev) => ({ ...prev, [item.id]: false }));
    }
  }, []);

  const handleResolve = useCallback(
    async (item: QueueItem, skuId?: string, action: "link" | "skip" = "link") => {
      try {
        await resolveQueueItem({ id: item.id, skuId, action });
        toast("Resolved.", { variant: "success" });
        loadQueue();
      } catch (error: any) {
        toast(error?.message || "Resolve failed.", { variant: "error" });
      }
    },
    [loadQueue],
  );

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <AdminSectionHeading
          title="Automation Queue"
          description="Run auto-match/create, review conflicts, and resolve exceptions."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="neutral" onClick={() => loadQueue()} disabled={loadingQueue}>
                {loadingQueue ? "Loading..." : "Refresh"}
              </Button>
              <Button variant="soft" onClick={() => handleRun(false, false)} disabled={running}>
                {running ? "Running..." : "Run"}
              </Button>
              <Button variant="soft" onClick={() => handleRun(true, false)} disabled={running}>
                {running ? "Running..." : "Seed from unmapped"}
              </Button>
              <Button onClick={() => handleRun(false, true)} disabled={running}>
                {running ? "Running..." : "Auto-create"}
              </Button>
            </div>
          }
        />
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-admin-text">Supplier</label>
            <select
              className="w-full rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
              value={selectedSupplierId}
              onChange={(event) => setSelectedSupplierId(event.target.value)}
            >
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name || supplier.code || supplier.id}
                </option>
              ))}
            </select>
            {selectedSupplier ? (
              <p className="text-xs text-admin-textSoft">
                {selectedSupplier.name || selectedSupplier.code || selectedSupplier.id}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-admin-text">Status</label>
              <select
                className="w-full rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {["pending", "conflict", "matched", "created", "done", "error", "all"].map((status) => (
                  <option key={status} value={status === "all" ? "" : status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-admin-text">Limit</label>
              <Input
                type="number"
                min={1}
                max={200}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value) || 50)}
              />
            </div>
          </div>
        </div>
      </AdminSurface>

      <AdminSurface>
        {loadingQueue ? (
          <p className="py-6 text-sm text-admin-textSoft">Loading queue...</p>
        ) : queue.length === 0 ? (
          <p className="py-6 text-sm text-admin-textSoft">Queue is empty.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] table-auto text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.18em] text-admin-textSubtle">
                  <th className="px-4 py-3">Vendor SKU</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Candidates</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => {
                  const candidates = item.candidate_skus ?? [];
                  const results = searchResultsById[item.id] ?? [];
                  const isSearching = Boolean(searchingById[item.id]);
                  const query = searchQueryById[item.id] ?? "";

                  return (
                    <tr key={item.id} className="border-t border-admin-border/60 align-top">
                      <td className="px-4 py-3 font-semibold text-admin-text">{item.vendor_sku}</td>
                      <td className="px-4 py-3 text-xs text-admin-textSoft">
                        {item.supplier_name || item.supplier_code || item.supplier_id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
                            item.status === "pending" && "bg-amber-100 text-amber-700",
                            item.status === "conflict" && "bg-red-100 text-red-700",
                            item.status === "matched" && "bg-emerald-100 text-emerald-700",
                            item.status === "created" && "bg-emerald-100 text-emerald-700",
                            item.status === "done" && "bg-slate-100 text-slate-700",
                          )}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-admin-textSoft">{item.reason || "-"}</td>
                      <td className="px-4 py-3 text-xs text-admin-textSoft">
                        {candidates.length ? candidates.join(", ") : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            <Input
                              value={query}
                              onChange={(event) =>
                                setSearchQueryById((prev) => ({ ...prev, [item.id]: event.target.value }))
                              }
                              placeholder="Search SKU"
                              className="min-w-[180px]"
                            />
                            <Button
                              variant="neutral"
                              onClick={() => handleSearchSku(item, query)}
                              disabled={isSearching}
                            >
                              {isSearching ? "Searching..." : "Find"}
                            </Button>
                          </div>
                          {results.length ? (
                            <div className="rounded-lg border border-admin-border/60 bg-white">
                              {results.map((result) => (
                                <div
                                  key={result.id}
                                  className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border/60 px-3 py-2 text-sm"
                                >
                                  <div>
                                    <div className="font-semibold text-admin-text">{result.title}</div>
                                    <div className="text-xs text-admin-textSoft">{result.slug}</div>
                                  </div>
                                  <Button
                                    variant="neutral"
                                    className="min-h-[28px] px-2 py-1 text-xs"
                                    onClick={() => handleResolve(item, result.id, "link")}
                                  >
                                    Resolve
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="ghost"
                              className="min-h-[28px] px-2 py-1 text-xs"
                              onClick={() => handleResolve(item, undefined, "skip")}
                            >
                              Skip
                            </Button>
                          </div>
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
