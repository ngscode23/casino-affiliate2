"use client";

import { useEffect, useState } from "react";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Input from "@ui/components/common/input";
import Button from "@ui/components/common/button";
import { supabase } from "@shared/lib/supabase";

const PAGE_SIZE = 50;

export type WebhookLogRow = {
  id: string;
  type: string;
  created_at: string;
  payload: unknown;
};

export function WebhooksClient() {
  const [rows, setRows] = useState<WebhookLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        let builder: any = supabase
          .from("webhook_logs")
          .select("id,type,created_at,payload")
          .order("created_at", { ascending: false })
          .range(from, to);
        if (query.trim()) {
          builder = builder.ilike("type", `%${query.trim()}%`);
        }
        const { data, error: dbError } = await builder;
        if (dbError) throw dbError;
        if (!cancelled) {
          setRows((data as WebhookLogRow[]) ?? []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(String(err?.message ?? err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, query]);

  useEffect(() => {
    setPage(0);
  }, [query]);

  async function purge() {
    try {
      const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { error: rpcError } = await (supabase as any).rpc("purge_webhook_logs", { cutoff_ts: cutoff });
      if (rpcError) throw rpcError;
      setPage(0);
      const { data } = await (supabase as any)
        .from("webhook_logs")
        .select("id,type,created_at,payload")
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);
      setRows((data as WebhookLogRow[]) ?? []);
    } catch (err: any) {
      window.alert(`Purge failed: ${String(err?.message ?? err)}`);
    }
  }

  return (
    <Section className="space-y-6 p-6">
      <Card className="p-6">
        <div className="mb-3 flex items-center gap-3">
          <h1 className="text-xl font-semibold">Webhook Logs</h1>
          <div className="ml-auto flex items-center gap-2">
            <Input
              className="h-9 w-[220px]"
              placeholder="Filter by type"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              variant="soft"
              className="h-9 min-h-0 px-3 text-sm"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={page === 0 || loading}
            >
              Prev
            </Button>
            <span className="text-sm">Page {page + 1}</span>
            <Button
              variant="soft"
              className="h-9 min-h-0 px-3 text-sm"
              onClick={() => setPage((value) => value + 1)}
              disabled={loading}
            >
              Next
            </Button>
            <Button
              variant="soft"
              className="h-9 min-h-0 px-3 text-sm"
              onClick={purge}
              disabled={loading}
              title="Delete logs older than 30 days"
            >
              Purge &gt;30d
            </Button>
          </div>
        </div>
        {loading ? (
          <div>Loading.</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : rows.length ? (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="rounded border border-white/10 p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-mono">{row.type}</span>
                  <span className="text-[var(--text-dim)]">{row.created_at}</span>
                </div>
                <details className="mt-1">
                  <summary className="cursor-pointer text-[var(--text-dim)]">payload</summary>
                  <pre className="whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(row.payload, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[var(--text-dim)]">No rows.</div>
        )}
      </Card>
    </Section>
  );
}
