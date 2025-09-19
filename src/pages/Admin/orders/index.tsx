import { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/ui/PageShell";
import Seo from "@/components/Seo";
import Skeleton from "@/components/common/skeleton";
import Input from "@/components/common/input";
import Button from "@/components/common/button";
import { supabase } from "@/lib/supabase";
import { getValidAccessToken } from "@/lib/auth";

type Order = {
  id: string;
  created_at: string;
  status: string;
  grand_total: number | null;
  currency: string | null;
};

type Payment = {
  id: string;
  order_id: string;
  status: string;
  amount: number;
  created_at: string;
};

function useAdminToken() {
  const [token, setToken] = useState<string>("");
  useEffect(() => {
    try {
      setToken(localStorage.getItem("admin:token") || "");
    } catch {}
  }, []);
  const save = (v: string) => {
    setToken(v);
    try { localStorage.setItem("admin:token", v); } catch {}
  };
  return { token, setToken: save };
}

async function callPayments(path: string, body: any, adminToken: string) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  const url = `/api/payments${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-admin-token": adminToken,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`payments ${path} ${res.status}`);
  return res.json();
}

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<Order[] | null>(null);
  const [pm, setPm] = useState<Record<string, Payment | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, setToken } = useAdminToken();
  const [summary, setSummary] = useState<{ total: number; pending: number; processing: number; succeeded: number; failed: number; cancelled: number; average_check: number; failed_share: number; conversion: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // summary via function
        try {
          const accessToken = await getValidAccessToken();
          if (!accessToken) throw new Error("Not authenticated");
          const sRes = await fetch("/api/admin/orders?days=30", { headers: { accept: "application/json", "x-admin-token": token, Authorization: `Bearer ${accessToken}` } });
          if (sRes.ok) {
            const s = await sRes.json();
            if (s?.ok && mounted) setSummary({
              total: s.total || 0,
              pending: s.pending || 0,
              processing: s.processing || 0,
              succeeded: s.succeeded || 0,
              failed: s.failed || 0,
              cancelled: s.cancelled || 0,
              average_check: Number(s.average_check || 0),
              failed_share: Number(s.failed_share || 0),
              conversion: Number(s.conversion || 0),
            });
          }
        } catch { /* ignore */ }
        const { data, error } = await supabase
          .from("orders")
          .select("id, created_at, status, grand_total, currency")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        const orders = (data || []) as Order[];
        if (mounted) setRows(orders);
        const ids = orders.map((o) => o.id);
        if (!ids.length) return;
        const pay = await supabase
          .from("payments")
          .select("id,order_id,status,amount,created_at")
          .in("order_id", ids)
          .order("created_at", { ascending: false });
        if (pay.error) return;
        const latest: Record<string, Payment> = {};
        for (const p of (pay.data || []) as Payment[]) {
          if (!latest[p.order_id]) latest[p.order_id] = p;
        }
        if (mounted) setPm(latest);
      } catch (e: any) {
        if (mounted) setError(e?.message || "load error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fmt = useMemo(() => new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }), []);

  return (
    <PageShell>
      <Seo title="Admin · Orders" description="Orders list" ogImage="/og.svg" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-semibold">Orders</h1>
          <div className="ml-auto inline-flex items-center gap-2 text-sm">
            <label className="text-[var(--text-dim)]">Admin token</label>
            <Input
              value={token}
              onChange={(e) => setToken(e.currentTarget.value)}
              placeholder="X-Admin-Token"
              className="w-64 h-9"
            />
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-sm">
            <div className="rounded-md border border-white/10 p-3">
              <div className="text-[var(--text-dim)]">Всего</div>
              <div className="text-lg font-semibold">{summary.total}</div>
            </div>
            <div className="rounded-md border border-white/10 p-3">
              <div className="text-[var(--text-dim)]">Конверсия</div>
              <div className="text-lg font-semibold">{summary.conversion}%</div>
            </div>
            <div className="rounded-md border border-white/10 p-3">
              <div className="text-[var(--text-dim)]">Средний чек</div>
              <div className="text-lg font-semibold">{fmt.format(summary.average_check)}</div>
            </div>
            <div className="rounded-md border border-white/10 p-3">
              <div className="text-[var(--text-dim)]">Доля failed</div>
              <div className="text-lg font-semibold">{summary.failed_share}%</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : error ? (
          <div className="text-rose-400">{error}</div>
        ) : !rows || rows.length === 0 ? (
          <div className="text-[var(--text-dim)]">No orders.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="text-left text-sm text-[var(--text-dim)] border-b border-white/10">
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Payment</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const p = pm[o.id];
                  const cur = (o.currency || "EUR").toUpperCase();
                  const nf = new Intl.NumberFormat(undefined, { style: "currency", currency: cur });
                  return (
                    <tr key={o.id} className="border-b border-white/10">
                      <td className="py-2 pr-4 font-mono text-xs">{o.id}</td>
                      <td className="py-2 pr-4">{new Date(o.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{o.status}</td>
                      <td className="py-2 pr-4">{nf.format(Number(o.grand_total || 0))}</td>
                      <td className="py-2 pr-4 text-sm">
                        {p ? (
                          <div>
                            <div className="text-xs">{p.id}</div>
                            <div>
                              <span className="text-[var(--text-dim)]">{p.status}</span> · {nf.format(Number(p.amount || 0))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--text-dim)]">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="soft"
                            className="h-9 min-h-0 px-3 text-sm"
                            onClick={async () => {
                              try {
                                const res = await callPayments("/create", { order_id: o.id }, token);
                                alert(`payment created: ${res.payment_id}`);
                                // refresh payments for this order
                                const pay = await supabase
                                  .from("payments")
                                  .select("id,order_id,status,amount,created_at")
                                  .eq("order_id", o.id)
                                  .order("created_at", { ascending: false })
                                  .limit(1)
                                  .single();
                                if (!pay.error && pay.data) setPm((m) => ({ ...m, [o.id]: pay.data as any }));
                              } catch (e: any) {
                                alert(e?.message || e);
                              }
                            }}
                            >
                            Create payment
                          </Button>
                          {p && (
                            <>
                              <Button
                                variant="soft"
                                className="h-9 min-h-0 px-3 text-sm"
                                onClick={async () => {
                                  try {
                                    await callPayments("/webhook", { payment_id: p.id, status: "succeeded" }, token);
                                    setPm((m) => ({ ...m, [o.id]: { ...(m[o.id] as any), status: "succeeded" } }));
                                  } catch (e: any) {
                                    alert(e?.message || e);
                                  }
                                }}
                              >
                                Mark succeeded
                              </Button>
                              <Button
                                variant="soft"
                                className="h-9 min-h-0 px-3 text-sm"
                                onClick={async () => {
                                  try {
                                    await callPayments("/webhook", { payment_id: p.id, status: "failed" }, token);
                                    setPm((m) => ({ ...m, [o.id]: { ...(m[o.id] as any), status: "failed" } }));
                                  } catch (e: any) {
                                    alert(e?.message || e);
                                  }
                                }}
                              >
                                Mark failed
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
