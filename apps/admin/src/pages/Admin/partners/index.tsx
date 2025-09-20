import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Input from "@ui/components/common/input";
import Select from "@ui/components/common/select";
import Button from "@ui/components/common/button";
import { supabase } from "@shared/lib/supabase";
import { fnUrl } from "@shared/lib/api";

type Partner = { id: string; name: string; email: string | null; plan: string; expires_at: string | null };

export default function PartnersPage() {
  const loc = useLocation();
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("BASIC");
  const [days, setDays] = useState(30);
  const [offerSlugs, setOfferSlugs] = useState("");
  const [coupon, setCoupon] = useState("");
  // paging + search
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const from = page * pageSize;
        const to = from + pageSize - 1;
        let qbuilder = (supabase as any)
          .from("partners")
          .select("id,name,email,plan,expires_at")
          .order("created_at",{ascending:false});
        if (q && q.trim()) {
          const needle = `%${q.trim()}%`;
          qbuilder = qbuilder.or(`name.ilike.${needle},email.ilike.${needle}`);
        }
        const { data, error } = await qbuilder.range(from, to);
        if (error) throw error;
        if (!cancelled) setRows((data as any) ?? []);
      } catch (e:any) { if(!cancelled)setError(String(e?.message||e)); }
      finally { if(!cancelled)setLoading(false); }
    })();
    return ()=>{cancelled=true};
  }, [page, q]);

  useEffect(() => { setPage(0); }, [q]);

  const status = useMemo(() => new URLSearchParams(loc.search).get("status"), [loc.search]);

  async function startCheckout() {
    const payload = { name, email, plan, days, offerSlugs: offerSlugs.split(",").map(s=>s.trim()).filter(Boolean) };
    const res = await fetch(fnUrl("checkout"), { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify(payload)});
    const j = await res.json();
    if (j?.url) window.location.href = j.url;
  }

  async function subscribe(p: string, interval: "MONTHLY" | "YEARLY") {
    try {
      if (!email.trim()) throw new Error("Email is required");
      const payload = { email: email.trim(), plan: p as any, interval, coupon: coupon.trim() || undefined };
      const res = await fetch(fnUrl('create-subscription'), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (j?.url) window.location.href = j.url; else throw new Error(j?.error || "Failed to create session");
    } catch (e:any) { alert("Error: " + String(e?.message || e)); }
  }

  async function openPortal() {
    try {
      if (!email.trim()) throw new Error("Email is required");
      const res = await fetch(fnUrl('customer-portal'), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      const j = await res.json();
      if (j?.url) window.location.href = j.url; else throw new Error(j?.error || "Failed to open portal");
    } catch (e:any) { alert("Error: " + String(e?.message || e)); }
  }

  async function expirePinsNow() {
    try {
      const { error } = await (supabase as any).rpc('expire_partner_pins');
      if (error) throw error;
      alert('Expired pins updated.');
    } catch (e:any) {
      alert('Error: ' + String(e?.message || e));
    }
  }

  async function ensurePartner(email: string, plan: string): Promise<string> {
    const { data, error } = await (supabase as any)
      .from("partners")
      .upsert({ name: name || (email.split("@")[0] || "Unknown"), email, plan }, { onConflict: "email,plan" })
      .select("id").limit(1).maybeSingle();
    if (error) throw error;
    return data?.id as string;
  }

  async function manualPin() {
    try {
      if (!email.trim()) throw new Error("Email is required");
      const partnerId = await ensurePartner(email.trim(), plan);
      const slugs = offerSlugs.split(",").map(s=>s.trim()).filter(Boolean);
      if (!slugs.length) throw new Error("Provide at least one slug");
      const rows = slugs.map(slug => ({ partner_id: partnerId, offer_slug: slug, pinned: true }));
      const { error } = await (supabase as any).from("partner_offers").upsert(rows, { onConflict: "partner_id,offer_slug" });
      if (error) throw error;
      alert("Pinned successfully");
    } catch (e:any) { alert("Error: " + String(e?.message||e)); }
  }

  async function manualUnpin() {
    try {
      if (!email.trim()) throw new Error("Email is required");
      const partnerId = await ensurePartner(email.trim(), plan);
      const slugs = offerSlugs.split(",").map(s=>s.trim()).filter(Boolean);
      if (!slugs.length) throw new Error("Provide at least one slug");
      const { error } = await (supabase as any)
        .from("partner_offers")
        .update({ pinned: false })
        .in("offer_slug", slugs)
        .eq("partner_id", partnerId);
      if (error) throw error;
      alert("Unpinned successfully");
    } catch (e:any) { alert("Error: " + String(e?.message||e)); }
  }

  return (
    <Section className="p-6 space-y-6">
      {status === "success" && (
        <div className="rounded border border-green-700/50 bg-green-900/20 text-green-200 p-3">Checkout completed. Pins will be applied shortly.</div>
      )}
      {status === "cancel" && (
        <div className="rounded border border-yellow-700/50 bg-yellow-900/20 text-yellow-200 p-3">Checkout cancelled.</div>
      )}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Partners</h1>
          <div className="flex items-center gap-2">
            <Button variant="soft" className="h-10 min-h-0" onClick={expirePinsNow}>Expire pins now</Button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <Input className="w-[260px] h-10" placeholder="Search name/email" value={q} onChange={e=>setQ(e.target.value)} />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="soft" className="h-10 min-h-0" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</Button>
            <span className="text-sm">Page {page+1}</span>
            <Button variant="soft" className="h-10 min-h-0" onClick={()=>setPage(p=>p+1)}>Next</Button>
          </div>
        </div>
        {loading ? <div>Loading…</div> : error ? <div className="text-red-400">{error}</div> : (
          <div className="text-sm space-y-1">
            {rows.filter(p=>{ if(!q.trim()) return true; const s=q.toLowerCase(); return p.name.toLowerCase().includes(s) || (p.email||'').toLowerCase().includes(s); }).map(p => (
              <div key={p.id} className="flex gap-3 justify-between">
                <span>{p.name} · {p.email || "-"} · {p.plan}</span>
                <span className="text-[var(--text-dim)]">{p.expires_at || "-"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Create Checkout</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <Input className="w-full h-11" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <Input className="w-full h-11" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Plan</label>
            <Select className="w-full" value={plan} onChange={e=>setPlan(e.target.value)}>
              <option>BASIC</option>
              <option>FEATURED</option>
              <option>TOP</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">Duration (days)</label>
            <Select className="w-full" value={days} onChange={e=>setDays(Number(e.target.value)) as any}>
              <option value={30}>30</option>
              <option value={90}>90</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Offer slugs (comma separated)</label>
            <Input className="w-full h-11" value={offerSlugs} onChange={e=>setOfferSlugs(e.target.value)} placeholder="slug1, slug2" />
          </div>
        </div>
        <Button variant="soft" className="mt-4 h-11 min-h-0" onClick={startCheckout}>Create Checkout</Button>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Subscriptions</h2>
        <p className="text-sm text-[var(--text-dim)] mb-3">Subscribe partner to BASIC/FEATURED/TOP (Monthly/Yearly) and open Customer Portal.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Partner email</label>
            <Input className="w-full h-11" value={email} onChange={e=>setEmail(e.target.value)} placeholder="editor@site.com" />
          </div>
          <div>
            <label className="block text-sm mb-1">Coupon / Promo code (optional)</label>
            <Input className="w-full h-11" value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="PROMO10" />
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(["BASIC","FEATURED","TOP"] as const).map(p => (
            <div key={p} className="rounded border border-white/10 p-3">
              <div className="text-sm font-semibold mb-2">{p}</div>
              <div className="flex gap-2">
                <Button variant="soft" className="h-10 min-h-0" onClick={()=>subscribe(p, "MONTHLY")}>Monthly</Button>
                <Button variant="soft" className="h-10 min-h-0" onClick={()=>subscribe(p, "YEARLY")}>Yearly</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Button variant="soft" className="h-11 min-h-0" onClick={openPortal}>Open Customer Portal</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Manual pin/unpin</h2>
        <p className="text-sm text-[var(--text-dim)] mb-3">Upsert partner by email + plan and pin/unpin listed slugs.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Partner email</label>
            <Input className="w-full h-11" value={email} onChange={e=>setEmail(e.target.value)} placeholder="editor@site.com" />
          </div>
          <div>
            <label className="block text-sm mb-1">Plan</label>
            <Select className="w-full" value={plan} onChange={e=>setPlan(e.target.value)}>
              <option>BASIC</option>
              <option>FEATURED</option>
              <option>TOP</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Offer slugs (comma separated)</label>
            <Input className="w-full h-11" value={offerSlugs} onChange={e=>setOfferSlugs(e.target.value)} placeholder="slug1, slug2" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="soft" className="h-11 min-h-0" onClick={manualPin}>Pin</Button>
          <Button variant="soft" className="h-11 min-h-0" onClick={manualUnpin}>Unpin</Button>
        </div>
      </Card>

      <WebhookLogsCard />
    </Section>
  );
}

function WebhookLogsCard() {
  const [rows, setRows] = useState<Array<{ type: string; created_at: string; payload: any }>>([] as any);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const { data, error } = await (supabase as any)
          .from('webhook_logs')
          .select('type,created_at,payload')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        if (!cancelled) setRows((data as any) ?? []);
      } catch (e:any) { if (!cancelled) setError(String(e?.message||e)); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true };
  }, []);

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-3">Webhook logs (last 100)</h2>
      {loading ? <div>Loading logs…</div> : error ? <div className="text-red-400">{error}</div> : (
        <div className="text-sm space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="rounded border border-white/10 p-2">
              <div className="flex justify-between"><span>{r.type}</span><span className="text-[var(--text-dim)]">{r.created_at}</span></div>
              <details className="mt-1">
                <summary className="cursor-pointer text-[var(--text-dim)]">payload</summary>
                <pre className="overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(r.payload, null, 2)}</pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

