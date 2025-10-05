"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Input from "@ui/components/common/input";
import Select from "@ui/components/common/select";
import Button from "@ui/components/common/button";
import { supabase } from "@shared/lib/supabase";
import { fnUrl } from "@shared/lib/api";

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
            <span className="text-sm">Page {page + 1}</span>
            <Button
              variant="soft"
              className="h-10 min-h-0"
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
        {loading ? (
          <div>Loading.</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : rows.length ? (
          <div className="space-y-1 text-sm">
            {rows.map((partner) => (
              <div key={partner.id} className="flex justify-between gap-3">
                <span>
                  {partner.name} · {partner.email || "-"} · {partner.plan}
                </span>
                <span className="text-[var(--text-dim)]">{partner.expires_at || "-"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[var(--text-dim)]">No partners found.</div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 font-semibold">Create Checkout</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Name</label>
            <Input className="h-11 w-full" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Email</label>
            <Input className="h-11 w-full" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Plan</label>
            <Select className="w-full" value={plan} onChange={(event) => setPlan(event.target.value)}>
              <option value="BASIC">BASIC</option>
              <option value="FEATURED">FEATURED</option>
              <option value="TOP">TOP</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Duration (days)</label>
            <Select
              className="w-full"
              value={String(days)}
              onChange={(event) => {
                const next = Number(event.target.value);
                setDays(Number.isFinite(next) ? next : 30);
              }}
            >
              <option value="30">30</option>
              <option value="90">90</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">Offer slugs (comma separated)</label>
            <Input
              className="h-11 w-full"
              value={offerSlugs}
              onChange={(event) => setOfferSlugs(event.target.value)}
              placeholder="slug1, slug2"
            />
          </div>
        </div>
        <Button variant="soft" className="mt-4 h-11 min-h-0" onClick={startCheckout}>
          Create Checkout
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 font-semibold">Subscriptions</h2>
        <p className="mb-3 text-sm text-[var(--text-dim)]">
          Subscribe partner to BASIC/FEATURED/TOP (Monthly/Yearly) and open Customer Portal.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Partner email</label>
            <Input
              className="h-11 w-full"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="editor@site.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Coupon / Promo code (optional)</label>
            <Input
              className="h-11 w-full"
              value={coupon}
              onChange={(event) => setCoupon(event.target.value)}
              placeholder="PROMO10"
            />
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(["BASIC", "FEATURED", "TOP"] as const).map((planName) => (
            <div key={planName} className="rounded border border-white/10 p-3">
              <div className="mb-2 text-sm font-semibold">{planName}</div>
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
            <label className="mb-1 block text-sm">Partner email</label>
            <Input
              className="h-11 w-full"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="editor@site.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Plan</label>
            <Select className="w-full" value={plan} onChange={(event) => setPlan(event.target.value)}>
              <option value="BASIC">BASIC</option>
              <option value="FEATURED">FEATURED</option>
              <option value="TOP">TOP</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">Offer slugs (comma separated)</label>
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

function WebhookLogsCard() {
  const [rows, setRows] = useState<Array<{ type: string; created_at: string; payload: unknown }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: dbError } = await (supabase as any)
          .from("webhook_logs")
          .select("type,created_at,payload")
          .order("created_at", { ascending: false })
          .limit(100);
        if (dbError) throw dbError;
        if (!cancelled) {
          setRows((data as Array<{ type: string; created_at: string; payload: unknown }>) ?? []);
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
  }, []);

  return (
    <Card className="p-6">
      <h2 className="mb-3 font-semibold">Webhook logs (last 100)</h2>
      {loading ? (
        <div>Loading logs.</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : rows.length ? (
        <div className="space-y-2 text-sm">
          {rows.map((row, index) => (
            <div key={`${row.type}-${row.created_at}-${index}`} className="rounded border border-white/10 p-2">
              <div className="flex justify-between">
                <span>{row.type}</span>
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
        <div className="text-[var(--text-dim)]">No logs found.</div>
      )}
    </Card>
  );
}
