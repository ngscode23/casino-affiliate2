"use client";

import { useCallback, useEffect, useState } from "react";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import { ButtonPrimary } from "@ui/components/ui/Buttons";
import { supabase } from "@shared/lib/supabase";
import { getUser } from "@shared/lib/auth";
import { fnUrl } from "@shared/lib/api";

type Row = { offer_slug: string; plan: string; expires_at: string | null };

function formatExpires(value: string | null) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  } catch {
    return value;
  }
}

export default function PartnerPortalClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const currentUser = getUser();
        const userEmail = currentUser?.email ?? null;
        if (!active) return;
        setEmail(userEmail);
        if (!userEmail) {
          setRows([]);
          return;
        }
        const { data, error: queryError } = await (supabase as any)
          .from("partner_offers")
          .select("offer_slug, partners!inner(plan,expires_at)")
          .eq("partners.email", userEmail)
          .eq("pinned", true)
          .limit(1000);
        if (!active) return;
        if (queryError) throw queryError;
        const mapped = ((data ?? []) as any[]).map((entry) => ({
          offer_slug: entry.offer_slug as string,
          plan: entry.partners?.plan as string,
          expires_at: entry.partners?.expires_at as string | null,
        }));
        setRows(mapped);
      } catch (e: any) {
        if (active) setError(String(e?.message || e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openPortal = useCallback(async () => {
    try {
      if (!email) {
        throw new Error("Email not found");
      }
      setBillingLoading(true);
      const res = await fetch(fnUrl("customer-portal"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      window.location.href = data.url as string;
    } catch (e: any) {
      alert(`Error: ${String(e?.message || e)}`);
    } finally {
      setBillingLoading(false);
    }
  }, [email]);

  return (
    <Section className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partner Portal</h1>
          <p className="text-sm text-neutral-500">
            View pinned offers and open the Stripe billing portal.
          </p>
        </div>
        <ButtonPrimary onClick={openPortal} disabled={!email || billingLoading}>
          {billingLoading ? "Opening…" : "Billing"}
        </ButtonPrimary>
      </div>
      <Card className="p-4">
        {loading ? (
          <div>Loading…</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : !email ? (
          <div className="text-sm text-neutral-500">
            Sign in to access partner benefits.
          </div>
        ) : rows.length === 0 ? (
          <div>No pinned offers yet.</div>
        ) : (
          <div className="space-y-2 text-sm">
            {rows.map((row, index) => (
              <div
                key={`${row.offer_slug}-${index}`}
                className="flex items-center justify-between rounded border border-white/10 bg-white/5 p-3"
              >
                <span className="truncate font-medium">{row.offer_slug}</span>
                <span className="flex items-center gap-4 text-neutral-500">
                  <span>{row.plan}</span>
                  <span>expires {formatExpires(row.expires_at)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Section>
  );
}
