"use client";

import { useEffect, useMemo, useState } from "react";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Input from "@ui/components/common/input";
import Button from "@ui/components/common/button";
import { adminFetch } from "@shared/lib/api";

const PAGE_SIZE = 50;

type StripeWebhookRow = {
  id: string;
  type: string;
  created_utc: string;
  livemode: boolean;
  mismatch_reason: string | null;
  processing_state: string | null;
  processing_error: string | null;
  notified_succeeded: boolean | null;
  notified_failed: boolean | null;
  notified_refunded: boolean | null;
  notified_desync: boolean | null;
  notified_requires_action: boolean | null;
  stripe_amount_cents: number | null;
  stripe_currency: string | null;
  expected_amount_cents: number | null;
  expected_currency: string | null;
};

type WebhookLogRow = {
  id: string;
  event_type: string;
  event_id: string | null;
  created_at: string;
  log_status: string;
  http_status: number | null;
  source: string | null;
  message: string | null;
  error: Record<string, unknown> | null;
};

const STATUS_COLORS: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-200 border border-blue-500/30",
  warning: "bg-amber-500/10 text-amber-200 border border-amber-500/30",
  error: "bg-rose-500/10 text-rose-200 border border-rose-500/30",
  pending_manual_review: "bg-purple-500/10 text-purple-200 border border-purple-500/30",
};

const PROCESSING_COLORS: Record<string, string> = {
  queued_manual_review: "text-amber-200",
  dispute_open: "text-rose-200",
  dispute_won: "text-emerald-200",
};

function Flag({ label, value }: { label: string; value: boolean | null | undefined }) {
  if (!value) return null;
  return (
    <Pill className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">{label}</Pill>
  );
}

function formatTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatAmount(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null || !currency) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-white/20 px-2 py-0.5 text-xs text-white/80 ${className}`}
    >
      {children}
    </span>
  );
}

export function WebhooksClient() {
  const [eventRows, setEventRows] = useState<StripeWebhookRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventQuery, setEventQuery] = useState("");
  const [eventState, setEventState] = useState("");
  const [mismatch, setMismatch] = useState("");
  const [eventPage, setEventPage] = useState(0);

  const [logRows, setLogRows] = useState<WebhookLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logQuery, setLogQuery] = useState("");
  const [logStatus, setLogStatus] = useState("");
  const [logSource, setLogSource] = useState("");
  const [logPage, setLogPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setEventsLoading(true);
        setEventsError(null);
        const params = new URLSearchParams();
        params.set("page", String(eventPage));
        params.set("pageSize", String(PAGE_SIZE));
        if (eventQuery.trim()) params.set("type", eventQuery.trim());
        if (eventState.trim()) params.set("state", eventState.trim());
        if (mismatch.trim()) params.set("mismatch", mismatch.trim());
        const res = await adminFetch(`/api/admin/webhooks/events?${params.toString()}`);
        if (!res.ok) throw new Error(await res.text());
        const payload = (await res.json()) as { ok: boolean; rows?: StripeWebhookRow[] };
        if (!cancelled) setEventRows(payload.rows ?? []);
      } catch (error: any) {
        if (!cancelled) setEventsError(String(error?.message ?? error));
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventPage, eventQuery, eventState, mismatch]);

  useEffect(() => {
    setEventPage(0);
  }, [eventQuery, eventState, mismatch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLogsLoading(true);
        setLogsError(null);
        const params = new URLSearchParams();
        params.set("page", String(logPage));
        params.set("pageSize", String(PAGE_SIZE));
        if (logQuery.trim()) params.set("q", logQuery.trim());
        if (logStatus.trim()) params.set("status", logStatus.trim());
        if (logSource.trim()) params.set("source", logSource.trim());
        const res = await adminFetch(`/api/admin/webhooks/logs?${params.toString()}`);
        if (!res.ok) throw new Error(await res.text());
        const payload = (await res.json()) as { ok: boolean; rows?: WebhookLogRow[] };
        if (!cancelled) setLogRows(payload.rows ?? []);
      } catch (error: any) {
        if (!cancelled) setLogsError(String(error?.message ?? error));
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logPage, logQuery, logStatus, logSource]);

  useEffect(() => {
    setLogPage(0);
  }, [logQuery, logStatus, logSource]);

  const mismatchOptions = useMemo(() => {
    const list = new Set(eventRows.map((row) => row.mismatch_reason).filter(Boolean));
    return Array.from(list) as string[];
  }, [eventRows]);

  const stateOptions = useMemo(() => {
    const list = new Set(eventRows.map((row) => row.processing_state).filter(Boolean));
    return Array.from(list) as string[];
  }, [eventRows]);

  async function purge() {
    try {
      const res = await adminFetch(`/api/admin/webhooks/purge`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setLogPage(0);
    } catch (error: any) {
      window.alert(`Purge failed: ${String(error?.message ?? error)}`);
    }
  }

  return (
    <Section className="space-y-6 p-6">
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Stripe Webhook Events</h1>
          <Input
            className="h-9 w-[220px]"
            placeholder="Filter by type"
            value={eventQuery}
            onChange={(event) => setEventQuery(event.target.value)}
          />
          <Input
            className="h-9 w-[180px]"
            placeholder="Processing state"
            list="processing-states"
            value={eventState}
            onChange={(event) => setEventState(event.target.value)}
          />
          <Input
            className="h-9 w-[180px]"
            placeholder="Mismatch reason"
            list="mismatch-reasons"
            value={mismatch}
            onChange={(event) => setMismatch(event.target.value)}
          />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="soft"
              className="h-9 min-h-0 px-3 text-sm"
              onClick={() => setEventPage((value) => Math.max(0, value - 1))}
              disabled={eventPage === 0 || eventsLoading}
            >
              Prev
            </Button>
            <span className="text-sm">Page {eventPage + 1}</span>
            <Button
              variant="soft"
              className="h-9 min-h-0 px-3 text-sm"
              onClick={() => setEventPage((value) => value + 1)}
              disabled={eventsLoading}
            >
              Next
            </Button>
          </div>
        </div>

        <datalist id="processing-states">
          {stateOptions.map((value) => (
            <option key={value} value={value ?? ""} />
          ))}
        </datalist>
        <datalist id="mismatch-reasons">
          {mismatchOptions.map((value) => (
            <option key={value} value={value ?? ""} />
          ))}
        </datalist>

        {eventsLoading ? (
          <div>Loading events…</div>
        ) : eventsError ? (
          <div className="text-red-400">{eventsError}</div>
        ) : eventRows.length ? (
          <div className="space-y-3">
            {eventRows.map((row) => {
              const flags = [
                { label: "notified_succeeded", value: row.notified_succeeded },
                { label: "notified_failed", value: row.notified_failed },
                { label: "notified_refunded", value: row.notified_refunded },
                { label: "notified_desync", value: row.notified_desync },
                { label: "notified_requires_action", value: row.notified_requires_action },
              ];
              return (
                <div key={row.id} className="rounded border border-white/10 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono text-[var(--text-bright)]">{row.type}</span>
                    <span className="text-xs text-[var(--text-dim)]">
                      {formatTimestamp(row.created_utc)}
                    </span>
                    {row.livemode ? (
                      <Pill className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                        live
                      </Pill>
                    ) : (
                      <Pill className="border-slate-500/30 bg-slate-500/10 text-slate-200">test</Pill>
                    )}
                    {row.processing_state ? (
                      <Pill
                        className={`border border-transparent text-xs ${PROCESSING_COLORS[row.processing_state] ?? "text-amber-200"}`}
                      >
                        {row.processing_state}
                      </Pill>
                    ) : null}
                    {row.mismatch_reason ? (
                      <Pill className="border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs">
                        {row.mismatch_reason}
                      </Pill>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-1">
                      {flags.map(
                        (flag) =>
                          flag.value && <Flag key={flag.label} label={flag.label} value={flag.value} />
                      )}
                    </div>
                    <div className="ml-auto text-xs text-[var(--text-dim)]">
                      Stripe:{" "}
                      {formatAmount(
                        row.stripe_amount_cents != null ? row.stripe_amount_cents / 100 : null,
                        row.stripe_currency ?? undefined
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div>
                      Expected:{" "}
                      {formatAmount(
                        row.expected_amount_cents != null ? row.expected_amount_cents / 100 : null,
                        row.expected_currency ?? undefined
                      )}
                    </div>
                    {row.processing_error ? (
                      <div className="text-rose-300">Error: {row.processing_error}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-[var(--text-dim)]">No events.</div>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Webhook Logs</h2>
          <Input
            className="h-9 w-[200px]"
            placeholder="Filter by type"
            value={logQuery}
            onChange={(event) => setLogQuery(event.target.value)}
          />
          <Input
            className="h-9 w-[160px]"
            placeholder="Status (info/warning/…)"
            value={logStatus}
            onChange={(event) => setLogStatus(event.target.value)}
          />
          <Input
            className="h-9 w-[160px]"
            placeholder="Source"
            value={logSource}
            onChange={(event) => setLogSource(event.target.value)}
          />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="soft"
              className="h-9 min-h-0 px-3 text-sm"
              onClick={() => setLogPage((value) => Math.max(0, value - 1))}
              disabled={logPage === 0 || logsLoading}
            >
              Prev
            </Button>
            <span className="text-sm">Page {logPage + 1}</span>
            <Button
              variant="soft"
              className="h-9 min-h-0 px-3 text-sm"
              onClick={() => setLogPage((value) => value + 1)}
              disabled={logsLoading}
            >
              Next
            </Button>
            <Button
              variant="soft"
              className="h-9 min-h-0 px-3 text-sm"
              onClick={purge}
              disabled={logsLoading}
              title="Delete logs older than 30 days"
            >
              Purge &gt;30d
            </Button>
          </div>
        </div>

        {logsLoading ? (
          <div>Loading logs…</div>
        ) : logsError ? (
          <div className="text-red-400">{logsError}</div>
        ) : logRows.length ? (
          <div className="space-y-3">
            {logRows.map((row) => {
              const badgeClass =
                STATUS_COLORS[row.log_status] ?? "bg-slate-500/10 text-slate-200 border border-slate-500/30";
              return (
                <div key={row.id} className="rounded border border-white/10 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[var(--text-bright)]">{row.event_type}</span>
                    {row.event_id ? (
                      <span className="text-xs text-[var(--text-dim)]">{row.event_id}</span>
                    ) : null}
                    <Pill className={badgeClass}>{row.log_status}</Pill>
                    {row.http_status != null ? (
                      <Pill className="border border-transparent text-xs text-[var(--text-dim)]">
                        HTTP {row.http_status}
                      </Pill>
                    ) : null}
                    {row.source ? (
                      <Pill className="border border-transparent text-xs text-[var(--text-dim)]">
                        {row.source}
                      </Pill>
                    ) : null}
                    <span className="ml-auto text-xs text-[var(--text-dim)]">
                      {formatTimestamp(row.created_at)}
                    </span>
                  </div>
                  {row.message ? <div className="mt-2 text-xs">{row.message}</div> : null}
                  {row.error ? (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-[var(--text-dim)]">details</summary>
                      <pre className="whitespace-pre-wrap break-words text-xs">
                        {JSON.stringify(row.error, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-[var(--text-dim)]">No logs.</div>
        )}
      </Card>
    </Section>
  );
}

