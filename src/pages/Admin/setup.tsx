import { useState } from "react";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import { upsertSettings, useSettings } from "@/lib/useSettings";
import Seo from "@/components/Seo";

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
              <label className="block text-sm mb-1">Site name</label>
              <input className="neon-input" value={siteName} onChange={e=>setSiteName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Site URL</label>
              <input className="neon-input" value={siteUrl} onChange={e=>setSiteUrl(e.target.value)} placeholder="https://example.com" />
            </div>
            <div>
              <label className="block text-sm mb-1">Brand logo URL</label>
              <input className="neon-input" value={brandLogo} onChange={e=>setBrandLogo(e.target.value)} placeholder="/logo.svg" />
            </div>
            <div>
              <label className="block text-sm mb-1">GA4 Measurement ID</label>
              <input className="neon-input" value={gaId} onChange={e=>setGaId(e.target.value)} placeholder="G-XXXXXXX" />
            </div>
            <button disabled={saving} className="neon-btn" type="submit">{saving?"Saving…":"Save"}</button>
            {msg && <div className="text-sm text-[var(--text-dim)]">{msg}</div>}
          </form>
        </Card>
      </Section>
    </>
  );
}

