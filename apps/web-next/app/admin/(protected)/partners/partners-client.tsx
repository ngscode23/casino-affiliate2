"use client";

import { labelTextSm } from "@/styles/classnames";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Input from "@ui/components/common/input";
import Select from "@ui/components/common/select";
import Button from "@ui/components/common/button";
import StatusBadge from "@ui/components/admin/StatusBadge";
import { supabase } from "@shared/lib/supabase";
import { fnUrl } from "@shared/lib/api";
import ErrorBanner from "@/components/ui/ErrorBanner";

const PAGE_SIZE = 50;

export type Partner = {
  id: string;
  name: string;
  email: string | null;
  plan: string;
  expires_at: string | null;
};

function splitSlugs(value: string): string[] {
  return value
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export function PartnersClient() {
  const searchParams = useSearchParams();
  const status = useMemo(() => searchParams?.get("status") ?? null, [searchParams]);

  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("BASIC");
  const [days, setDays] = useState(30);
  const [offerSlugs, setOfferSlugs] = useState("");
  const [coupon, setCoupon] = useState("");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query: any = supabase
          .from("partners")
          .select("id,name,email,plan,expires_at")
          .order("created_at", { ascending: false });

        if (q.trim()) {
          const needle = `%${q.trim()}%`;
          query = query.or(`name.ilike.${needle},email.ilike.${needle}`);
        }

        const { data, error: dbError } = await query.range(from, to);
        if (dbError) throw dbError;
        if (!cancelled) {
          setRows((data as Partner[]) ?? []);
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
  }, [page, q]);

  useEffect(() => {
    setPage(0);
  }, [q]);

  async function startCheckout() {
    try {
      const payload = {
        name,
        email,
        plan,
        days,
        offerSlugs: splitSlugs(offerSlugs),
      };
      const response = await fetch(fnUrl("checkout"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (json?.url) {
        window.location.href = json.url;
      } else if (json?.error) {
        throw new Error(String(json.error));
      }
    } catch (err: any) {
      window.alert(`Error: ${String(err?.message ?? err)}`);
    }
  }

  async function subscribe(planName: string, interval: "MONTHLY" | "YEARLY") {
    try {
      if (!email.trim()) throw new Error("Email is required");
      const payload = {
        email: email.trim(),
        plan: planName,
        interval,
        coupon: coupon.trim() || undefined,
      };
      const response = await fetch(fnUrl("create-subscription"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (json?.url) {
        window.location.href = json.url;
      } else {
        throw new Error(String(json?.error || "Failed to create session"));
      }
    } catch (err: any) {
      window.alert(`Error: ${String(err?.message ?? err)}`);
    }
  }

  async function openPortal() {
    try {
      if (!email.trim()) throw new Error("Email is required");
      const response = await fetch(fnUrl("customer-portal"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await response.json();
      if (json?.url) {
        window.location.href = json.url;
      } else {
        throw new Error(String(json?.error || "Failed to open portal"));
      }
    } catch (err: any) {
      window.alert(`Error: ${String(err?.message ?? err)}`);
    }
  }

  async function expirePinsNow() {
    try {
      const { error: rpcError } = await (supabase as any).rpc("expire_partner_pins");
      if (rpcError) throw rpcError;
      window.alert("Expired pins updated.");
    } catch (err: any) {
      window.alert(`Error: ${String(err?.message ?? err)}`);
    }
  }

  async function ensurePartner(emailValue: string, planValue: string): Promise<string> {
    const { data, error: upsertError } = await (supabase as any)
      .from("partners")
      .upsert(
        { name: name || emailValue.split("@")[0] || "Unknown", email: emailValue, plan: planValue },
        { onConflict: "email,plan" },
      )
      .select("id")
      .limit(1)
      .maybeSingle();
    if (upsertError) throw upsertError;
    return (data?.id as string) ?? "";
  }

  async function manualPin() {
    try {
      if (!email.trim()) throw new Error("Email is required");
      const partnerId = await ensurePartner(email.trim(), plan);
      const slugs = splitSlugs(offerSlugs);
      if (!slugs.length) throw new Error("Provide at least one slug");
      const rowsToUpsert = slugs.map((slug) => ({ partner_id: partnerId, offer_slug: slug, pinned: true }));
      const { error: upsertError } = await (supabase as any)
        .from("partner_offers")
        .upsert(rowsToUpsert, { onConflict: "partner_id,offer_slug" });
      if (upsertError) throw upsertError;
      window.alert("Pinned successfully");
    } catch (err: any) {
      window.alert(`Error: ${String(err?.message ?? err)}`);
    }
  }

  async function manualUnpin() {
    try {
      if (!email.trim()) throw new Error("Email is required");
      const partnerId = await ensurePartner(email.trim(), plan);
      const slugs = splitSlugs(offerSlugs);
      if (!slugs.length) throw new Error("Provide at least one slug");
      const { error: updateError } = await (supabase as any)
        .from("partner_offers")
        .update({ pinned: false })
        .in("offer_slug", slugs)
        .eq("partner_id", partnerId);
      if (updateError) throw updateError;
      window.alert("Unpinned successfully");
    } catch (err: any) {
      window.alert(`Error: ${String(err?.message ?? err)}`);
    }
  }

  return (
    <Section className="p-6 space-y-6">
      {status === "success" ? (
        <div className="rounded border border-green-700/50 bg-green-900/20 p-3 text-green-200">
          Checkout completed. Pins will be applied shortly.
        </div>
      ) : null}
      {status === "cancel" ? (
        <div className="rounded border border-yellow-700/50 bg-yellow-900/20 p-3 text-yellow-200">
          Checkout cancelled.
        </div>
      ) : null}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Partners</h1>
          <div className="flex items-center gap-2">
            <Button variant="soft" className="h-10 min-h-0" onClick={expirePinsNow}>
              Expire pins now
            </Button>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-3">
          <Input
            className="h-10 w-[260px]"
            placeholder="Search name/email"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="soft"
              className="h-10 min-h-0"
              disabled={page === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              Prev
            </Button>
            <Button
              variant="soft"
              className="h-10 min-h-0"
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
        {error ? (
          <div className="mb-3">
            <ErrorBanner description={error} onRetry={() => setError(null)} />
          </div>
        ) : null}
        <div className="overflow-hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Plan</th>
                <th className="px-4 py-2 text-left font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-2">
                    <span className="font-medium">{row.name}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-[var(--text-dim)]">{row.email ?? "-"}</span>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={row.plan} />
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-[var(--text-dim)]">
                      {row.expires_at ? new Date(row.expires_at).toLocaleDateString() : "-"}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-[var(--text-dim)]" colSpan={4}>
                    No partners found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="mb-3 font-semibold">Create checkout</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelTextSm}>Name</label>
            <Input
              className="h-11 w-full"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Partner name"
            />
          </div>
          <div>
            <label className={labelTextSm}>Email</label>
            <Input
              className="h-11 w-full"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="partner@example.com"
            />
          </div>
          <div>
            <label className={labelTextSm}>Plan</label>
            <Select className="w-full" value={plan} onChange={(event) => setPlan(event.target.value)}>
              <option value="BASIC">BASIC</option>
              <option value="FEATURED">FEATURED</option>
              <option value="TOP">TOP</option>
            </Select>
          </div>
          <div>
            <label className={labelTextSm}>Days</label>
            <Input
              type="number"
              className="h-11 w-full"
              value={days}
              onChange={(event) => setDays(Number(event.target.value) || 0)}
              min={1}
              max={365}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelTextSm}>Offer slugs (comma separated)</label>
            <Input
              className="h-11 w-full"
              value={offerSlugs}
              onChange={(event) => setOfferSlugs(event.target.value)}
              placeholder="slug1, slug2"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button variant="primary" className="h-11 min-h-0" onClick={startCheckout}>
            Start checkout
          </Button>
        </div>
      </Card>
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Subscriptions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelTextSm}>Customer email</label>
            <Input
              className="h-11 w-full"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="subscriber@example.com"
            />
          </div>
          <div>
            <label className={labelTextSm}>Coupon (optional)</label>
            <Input
              className="h-11 w-full"
              value={coupon}
              onChange={(event) => setCoupon(event.target.value)}
              placeholder="PROMO2025"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {["BASIC", "FEATURED", "TOP"].map((planName) => (
            <div key={planName} className="space-y-2 rounded border border-[var(--border-subtle)] p-3">
              <div className="font-medium">{planName}</div>
              <div className="flex gap-2">
                <Button variant="soft" className="h-10 min-h-0" onClick={() => subscribe(planName, "MONTHLY")}>
                  Monthly
                </Button>
                <Button variant="soft" className="h-10 min-h-0" onClick={() => subscribe(planName, "YEARLY")}>
                  Yearly
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Button variant="soft" className="h-11 min-h-0" onClick={openPortal}>
            Open Customer Portal
          </Button>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="mb-3 font-semibold">Manual pin/unpin</h2>
        <p className="mb-3 text-sm text-[var(--text-dim)]">
          Upsert partner by email + plan and pin/unpin listed slugs.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelTextSm}>Partner email</label>
            <Input
              className="h-11 w-full"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="editor@site.com"
            />
          </div>
          <div>
            <label className={labelTextSm}>Plan</label>
            <Select className="w-full" value={plan} onChange={(event) => setPlan(event.target.value)}>
              <option value="BASIC">BASIC</option>
              <option value="FEATURED">FEATURED</option>
              <option value="TOP">TOP</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelTextSm}>Offer slugs (comma separated)</label>
            <Input
              className="h-11 w-full"
              value={offerSlugs}
              onChange={(event) => setOfferSlugs(event.target.value)}
              placeholder="slug1, slug2"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="soft" className="h-11 min-h-0" onClick={manualPin}>
            Pin
          </Button>
          <Button variant="soft" className="h-11 min-h-0" onClick={manualUnpin}>
            Unpin
          </Button>
        </div>
      </Card>
      <WebhookLogsCard />
    </Section>
  );
}

type WebhookLogRow = {
  id: string;
  event_type: string;
  event_id: string | null;
  created_at: string;
  log_status: string;
  source: string | null;
  message: string | null;
  error: Record<string, unknown> | null;
};

function WebhookLogsCard() {
  const [rows, setRows] = useState<WebhookLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({ pageSize: "50" });
        if (eventType.trim()) params.set("q", eventType.trim());
        if (status.trim()) params.set("status", status.trim());

        const response = await fetch(`/api/admin/webhooks/logs?${params.toString()}`, {
          headers: { accept: "application/json" },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Failed to load webhook logs (${response.status})`);
        }

        const json: any = await response.json();
        if (!cancelled) {
          setRows(Array.isArray(json.rows) ? (json.rows as WebhookLogRow[]) : []);
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
  }, [eventType, status, refreshToken]);

  return (
    <Card className="p-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">Webhook logs</h2>
        <Input
          className="h-9 w-[160px]"
          placeholder="Event type"
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
        />
        <Input
          className="h-9 w-[140px]"
          placeholder="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        />
        <Button
          variant="soft"
          className="h-9 min-h-0 px-3 text-xs"
          onClick={() => setRefreshToken((value) => value + 1)}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
      {loading ? (
        <div>Loading logs.</div>
      ) : error ? (
        <ErrorBanner description={error} onRetry={() => setError(null)} />
      ) : rows.length ? (
        <div className="space-y-2 text-sm">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-[var(--text-main)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-[var(--text-dim)]">{row.id}</span>
                <span className="text-xs text-[var(--text-dim)]">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
                <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide">
                  {row.event_type}
                </span>
                <span>{row.log_status}</span>
                {row.source ? <span className="text-[var(--text-soft)]">({row.source})</span> : null}
              </div>
              {row.message ? (
                <p className="mt-1 text-xs text-[var(--text-soft)]">{row.message}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[var(--text-dim)]">No webhook logs found.</div>
      )}
    </Card>
  );
}
