import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import { supabase } from "@/lib/supabase";

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
        const { data, error } = await (supabase as any)
          .from("partners")
          .select("id,name,email,plan,expires_at")
          .order("created_at",{ascending:false})
          .range(from, to);
        if (error) throw error;
        if (!cancelled) setRows((data as any) ?? []);
      } catch (e:any) { if(!cancelled)setError(String(e?.message||e)); }
      finally { if(!cancelled)setLoading(false); }
    })();
    return ()=>{cancelled=true};
  }, [page]);

  const status = useMemo(() => new URLSearchParams(loc.search).get("status"), [loc.search]);

  async function startCheckout() {
    const payload = { name, email, plan, days, offerSlugs: offerSlugs.split(",").map(s=>s.trim()).filter(Boolean) };
    const res = await fetch("/.netlify/functions/checkout", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify(payload)});
    const j = await res.json();
    if (j?.url) window.location.href = j.url;
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
        <h1 className="text-xl font-semibold mb-4">Partners</h1>
        <div className="flex items-center gap-3 mb-3">
          <input className="neon-input w-[260px]" placeholder="Search name/email" value={q} onChange={e=>setQ(e.target.value)} />
          <div className="ml-auto flex items-center gap-2">
            <button className="neon-btn" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</button>
            <span className="text-sm">Page {page+1}</span>
            <button className="neon-btn" onClick={()=>setPage(p=>p+1)}>Next</button>
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
            <input className="neon-input" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="neon-input" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Plan</label>
            <select className="neon-input" value={plan} onChange={e=>setPlan(e.target.value)}>
              <option>BASIC</option>
              <option>FEATURED</option>
              <option>TOP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Duration (days)</label>
            <select className="neon-input" value={days} onChange={e=>setDays(Number(e.target.value))}>
              <option value={30}>30</option>
              <option value={90}>90</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Offer slugs (comma separated)</label>
            <input className="neon-input" value={offerSlugs} onChange={e=>setOfferSlugs(e.target.value)} placeholder="slug1, slug2" />
          </div>
        </div>
        <button className="neon-btn mt-4" onClick={startCheckout}>Create Checkout</button>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Manual pin/unpin</h2>
        <p className="text-sm text-[var(--text-dim)] mb-3">Upsert partner by email + plan and pin/unpin listed slugs.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Partner email</label>
            <input className="neon-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="editor@site.com" />
          </div>
          <div>
            <label className="block text-sm mb-1">Plan</label>
            <select className="neon-input" value={plan} onChange={e=>setPlan(e.target.value)}>
              <option>BASIC</option>
              <option>FEATURED</option>
              <option>TOP</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Offer slugs (comma separated)</label>
            <input className="neon-input" value={offerSlugs} onChange={e=>setOfferSlugs(e.target.value)} placeholder="slug1, slug2" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="neon-btn" onClick={manualPin}>Pin</button>
          <button className="neon-btn" onClick={manualUnpin}>Unpin</button>
        </div>
      </Card>
    </Section>
  );
}
