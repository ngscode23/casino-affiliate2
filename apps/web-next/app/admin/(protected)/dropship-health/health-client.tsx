"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Button from "@ui/components/common/button";
import Skeleton from "@ui/components/common/skeleton";

import { AdminSurface, AdminStack, AdminSectionHeading } from "@/components/admin/layout";

const EMPTY_ARRAY: HealthSample[] = [];

type HealthSample = {
  id: string;
  sku: string | null;
  title: string | null;
};

type HealthResponse = {
  ok: boolean;
  generated_at?: string;
  limit?: number;
  stale_hours?: number;
  truncated?: boolean;
  counts?: {
    total_skus?: number;
    active_skus?: number;
    inactive_products?: number;
    skus_without_offers?: number;
    inventory_missing?: number;
    out_of_stock?: number;
    inventory_stale?: number;
  };
  samples?: {
    inactive_products?: HealthSample[];
    skus_without_offers?: HealthSample[];
    inventory_missing?: HealthSample[];
    out_of_stock?: HealthSample[];
    inventory_stale?: HealthSample[];
  };
  error?: string;
  message?: string;
};

function formatTimestamp(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surfaceSubtle px-4 py-3">
      <div className="text-xs uppercase tracking-[0.2em] text-admin-textSubtle">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-admin-text">{value}</div>
    </div>
  );
}

function IssueList({ title, items }: { title: string; items?: HealthSample[] }) {
  const list = items ?? EMPTY_ARRAY;
  return (
    <AdminSurface padded="sm">
      <AdminSectionHeading title={title} description={`Showing ${list.length} sample item(s).`} />
      {list.length ? (
        <ul className="mt-4 space-y-3 text-sm">
          {list.map((item) => (
            <li key={item.id} className="flex flex-col gap-1">
              <Link
                className="text-admin-primary hover:underline"
                href={`/admin/shop/products/${item.id}`}
              >
                {item.title || item.sku || item.id}
              </Link>
              <div className="text-xs text-admin-textSubtle">
                <span className="font-mono">{item.id}</span>
                {item.sku ? ` • SKU: ${item.sku}` : ""}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-admin-textSubtle">No issues found.</p>
      )}
    </AdminSurface>
  );
}

export function DropshipHealthClient() {
  const [state, setState] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/dropship/health", { credentials: "include" });
      const payload = (await response.json().catch(() => ({}))) as HealthResponse;
      setState(payload);
    } catch (error: any) {
      setState({ ok: false, error: "request_failed", message: error?.message || String(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealth();
  }, []);

  const counts = state?.counts ?? {};
  const samples = state?.samples ?? {};

  const summaryItems = useMemo(
    () => [
      { label: "Total SKUs", value: counts.total_skus ?? 0 },
      { label: "Active SKUs", value: counts.active_skus ?? 0 },
      { label: "Inactive", value: counts.inactive_products ?? 0 },
      { label: "No offers", value: counts.skus_without_offers ?? 0 },
      { label: "Inventory missing", value: counts.inventory_missing ?? 0 },
      { label: "Out of stock", value: counts.out_of_stock ?? 0 },
      { label: "Inventory stale", value: counts.inventory_stale ?? 0 },
    ],
    [counts],
  );

  return (
    <AdminStack gap="lg">
      <AdminSurface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm text-admin-textSoft">Last check</div>
            <div className="text-sm font-medium text-admin-text">
              {state?.generated_at ? formatTimestamp(state.generated_at) : "-"}
            </div>
            {state?.truncated ? (
              <div className="text-xs text-amber-700">
                Showing a limited sample. Increase limit to scan more SKUs.
              </div>
            ) : null}
          </div>
          <Button variant="soft" onClick={fetchHealth} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </AdminSurface>

      {loading ? (
        <AdminSurface>
          <Skeleton className="h-6 w-48" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16" />
            ))}
          </div>
        </AdminSurface>
      ) : state?.ok ? (
        <AdminSurface>
          <AdminSectionHeading title="Summary" description="Key blockers before checkout and payment." />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summaryItems.map((item) => (
              <SummaryCard key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </AdminSurface>
      ) : (
        <AdminSurface tone="muted">
          <div className="text-sm text-rose-600">
            {state?.message || "Failed to load dropship health."}
          </div>
        </AdminSurface>
      )}

      {state?.ok ? (
        <AdminStack gap="lg">
          <IssueList title="Inactive or unavailable SKUs" items={samples.inactive_products} />
          <IssueList title="SKUs without active offers" items={samples.skus_without_offers} />
          <IssueList title="Inventory missing" items={samples.inventory_missing} />
          <IssueList title="Out of stock" items={samples.out_of_stock} />
          <IssueList title="Inventory stale" items={samples.inventory_stale} />
        </AdminStack>
      ) : null}
    </AdminStack>
  );
}
