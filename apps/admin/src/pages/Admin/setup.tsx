import { useState } from "react";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import { upsertSettings, useSettings } from "@shared/lib/useSettings";
import Seo from "@ui/components/Seo";

export default function SetupPage() {
  const { settings } = useSettings();
  const [siteName, setSiteName] = useState(settings.siteName);
  const [siteUrl, setSiteUrl] = useState(settings.siteUrl);
  const [brandLogo, setBrandLogo] = useState(settings.brandLogo);
  const [gaId, setGaId] = useState(settings.gaId);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      await upsertSettings({ siteName, siteUrl, brandLogo, gaId });
      setMsg("Saved");
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally { setSaving(false); }
  }

  return (
    <>
      <Seo title="Setup" description="Configure branding and analytics." />
      <Section className="p-6">
        <Card className="p-6 max-w-2xl">
          <h1 className="text-2xl font-bold mb-4">Site Setup</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-muted">Site name</label>
              <input className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:bg-white/10 dark:border-white/15" value={siteName} onChange={e=>setSiteName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted">Site URL</label>
              <input className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:bg-white/10 dark:border-white/15" value={siteUrl} onChange={e=>setSiteUrl(e.target.value)} placeholder="https://example.com" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted">Brand logo URL</label>
              <input className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:bg-white/10 dark:border-white/15" value={brandLogo} onChange={e=>setBrandLogo(e.target.value)} placeholder="/logo.svg" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted">GA4 Measurement ID</label>
              <input className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:bg-white/10 dark:border-white/15" value={gaId} onChange={e=>setGaId(e.target.value)} placeholder="G-XXXXXXX" />
            </div>
            <button disabled={saving} className="rounded-xl px-3 py-2 border border-border bg-white text-text shadow-sm transition hover:bg-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white" type="submit">{saving?"Saving…":"Save"}</button>
            {msg && <div className="text-sm text-muted">{msg}</div>}
          </form>
        </Card>
      </Section>
    </>
  );
}

