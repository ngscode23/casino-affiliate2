// src/pages/Pricing/index.tsx
import { useState } from 'react';
import Section from '@/components/common/section';
import Card from '@/components/common/card';
import { ButtonPrimary, ButtonGhost } from '@/components/ui/Buttons';
import { fnUrl } from '@/lib/api';

type Interval = 'MONTHLY'|'YEARLY';

const PLANS: Array<{ key: 'BASIC'|'FEATURED'|'TOP'; title: string; features: string[] }>= [
  { key: 'BASIC', title: 'Basic', features: ['Standard listing', 'Analytics access'] },
  { key: 'FEATURED', title: 'Featured', features: ['Highlighted placement', 'Priority support'] },
  { key: 'TOP', title: 'Top', features: ['Top of list', 'Max visibility'] },
];

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>('MONTHLY');
  const [email, setEmail] = useState('');
  const [coupon, setCoupon] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  async function subscribe(plan: 'BASIC'|'FEATURED'|'TOP') {
    try {
      if (!email.trim()) throw new Error('Email is required');
      setLoading(plan);
      const res = await fetch(fnUrl('create-subscription'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), plan, interval, coupon: coupon.trim() || undefined })
      });
      const j = await res.json();
      if (j?.url) window.location.href = j.url; else throw new Error(j?.error || 'Failed to create session');
    } catch (e: any) {
      alert('Error: ' + String(e?.message || e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <Section className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="text-[var(--text-dim)]">Choose a plan and start promoting your offers.</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <ButtonGhost className={interval==='MONTHLY' ? 'bg-white/10 border-white/15' : ''} onClick={()=>setInterval('MONTHLY')}>Monthly</ButtonGhost>
        <ButtonGhost className={interval==='YEARLY' ? 'bg-white/10 border-white/15' : ''} onClick={()=>setInterval('YEARLY')}>Yearly</ButtonGhost>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {PLANS.map(p => (
            <div key={p.key} className="rounded border border-white/10 p-4 space-y-3">
              <div className="text-xl font-semibold">{p.title}</div>
              <ul className="text-sm list-disc pl-5 space-y-1 text-[var(--text-dim)]">
                {p.features.map((f, i)=> <li key={i}>{f}</li>)}
              </ul>
              <ButtonPrimary disabled={loading===p.key} className="w-full" onClick={()=>subscribe(p.key)}>
                {loading===p.key? 'Opening Checkout...' : 'Subscribe'}
              </ButtonPrimary>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div>
            <label className="block text-sm mb-1">Coupon / Promo (optional)</label>
            <input className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40" value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="PROMO10" />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">FAQ</h2>
        <div className="space-y-3 text-sm text-[var(--text-dim)]">
          <div>
            <div className="font-semibold text-[var(--text)]">Can I cancel anytime?</div>
            <div>Yes. Manage your subscription in the billing portal after checkout.</div>
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">Do you support coupons?</div>
            <div>Yes. Enter a coupon before opening checkout.</div>
          </div>
        </div>
      </Card>
    </Section>
  );
}
