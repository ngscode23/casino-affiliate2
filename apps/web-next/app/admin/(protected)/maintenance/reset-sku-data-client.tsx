"use client";

import { useMemo, useState } from "react";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { AdminSectionHeading, AdminSurface } from "@/components/admin/layout";

const CONFIRM_PHRASE = "RESET SKU DATA";

type ResetResult = {
  table: string;
  deleted: number;
  skipped?: boolean;
  reason?: string;
};

export function ResetSkuDataClient() {
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResetResult[] | null>(null);

  const canSubmit = confirmText.trim() === CONFIRM_PHRASE && !running;
  const deletedTotal = useMemo(() => {
    if (!results) return null;
    return results.reduce((sum, row) => sum + (row.deleted ?? 0), 0);
  }, [results]);

  async function runReset() {
    if (!canSubmit) return;
    try {
      setRunning(true);
      setError(null);
      setResults(null);
      const response = await fetch("/api/admin/maintenance/reset-sku-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirm: CONFIRM_PHRASE }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        results?: ResetResult[];
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || payload.error || "Reset failed");
      }
      setResults(payload.results ?? []);
      setConfirmText("");
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <AdminSurface>
      <AdminSectionHeading
        title="Reset SKU + Model data"
        description="Deletes SKU data and catalog models. Categories and brands remain."
        actions={
          <Button variant="danger" disabled={!canSubmit} onClick={runReset}>
            {running ? "Resetting..." : "Reset now"}
          </Button>
        }
      />
      <div className="mt-4 space-y-3 text-sm text-admin-textSoft">
        <p>This action deletes:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>All SKUs in public.ecom_products.</li>
          <li>All catalog models in catalog.products and related tables.</li>
          <li>Supplier mappings, offers, inventory, and unmapped feed rows.</li>
          <li>SKU-linked analytics (impressions, clicks, wishlist, reviews) and order items.</li>
        </ul>
        <p className="font-semibold text-admin-text">Type the confirmation phrase to enable the button.</p>
        <Input
          className="h-10 max-w-[280px]"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={CONFIRM_PHRASE}
        />
      </div>

      {error ? <div className="mt-4 text-sm text-admin-danger">{error}</div> : null}

      {results ? (
        <div className="mt-6 rounded-xl border border-admin-border bg-admin-surfaceSubtle p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-semibold text-admin-text">Reset summary</div>
            {deletedTotal != null ? (
              <div className="text-xs text-admin-textSoft">Total deleted: {deletedTotal}</div>
            ) : null}
          </div>
          <div className="mt-3 space-y-1">
            {results.map((row) => (
              <div key={row.table} className="flex items-center justify-between gap-3">
                <div className="text-admin-textSoft">
                  {row.table}
                  {row.skipped ? " (skipped)" : ""}
                </div>
                <div className="font-semibold text-admin-text">{row.deleted}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </AdminSurface>
  );
}
