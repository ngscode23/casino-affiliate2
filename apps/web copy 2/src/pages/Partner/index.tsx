// src/pages/Partner/index.tsx
import { useEffect, useState } from 'react';
import Section from '@ui/components/common/section';
import Card from '@ui/components/common/card';
import { supabase } from '@shared/lib/supabase';
import { ButtonPrimary } from '@ui/components/ui/Buttons';
import { getUser } from '@shared/lib/auth';
import { fnUrl } from '@shared/lib/api';

type Row = { offer_slug: string; plan: string; expires_at: string | null };

export default function PartnerPortalPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const u = await getUser();
        const em = (u?.email || null) as string | null;
        if (!alive) return;
        setEmail(em);
        if (!em) return;
        const { data, error } = await (supabase as any)
          .from('partner_offers')
          .select('offer_slug, partners!inner(plan,expires_at)')
          .eq('partners.email', em)
          .eq('pinned', true)
          .limit(1000);
        if (error) throw error;
        const mapped = (data as any[]).map(d => ({ offer_slug: d.offer_slug, plan: d.partners.plan, expires_at: d.partners.expires_at }));
        if (alive) setRows(mapped);
      } catch (e:any) { if (alive) setError(String(e?.message||e)); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  async function openPortal() {
    try {
      if (!email) throw new Error('No email');
      const res = await fetch(fnUrl('customer-portal'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const j = await res.json();
      if (j?.url) window.location.href = j.url; else throw new Error(j?.error || 'Failed to open portal');
    } catch (e:any) { alert('Error: ' + String(e?.message||e)); }
  }

  return (
    <Section className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Partner Portal</h1>
        <ButtonPrimary onClick={openPortal}>Billing</ButtonPrimary>
      </div>
      <Card className="p-4">
        {loading ? <div>Loading…</div> : error ? <div className="text-red-400">{error}</div> : (
          rows.length ? (
            <div className="text-sm space-y-2">
              {rows.map((r,i)=> (
                <div key={i} className="flex items-center justify-between rounded border border-white/10 p-2">
                  <div className="truncate">{r.offer_slug}</div>
                  <div className="flex items-center gap-4 text-[var(--text-dim)]">
                    <span>{r.plan}</span>
                    <span>{r.expires_at ? `expires ${r.expires_at}` : '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div>No pinned offers yet.</div>
        )}
      </Card>
    </Section>
  );
}

