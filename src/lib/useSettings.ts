import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SITE_NAME, SITE_URL, BRAND_LOGO } from "@/config";

type Settings = {
  siteName?: string;
  siteUrl?: string;
  brandLogo?: string;
  gaId?: string;
};

const CACHE_KEY = "settings-cache-v1";

function readCache(): Settings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Settings) : null;
  } catch { return null; }
}

function writeCache(s: Settings) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(readCache());
  const [loading, setLoading] = useState(!settings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("settings")
          .select("key,value")
          .in("key", ["siteName","siteUrl","brandLogo","gaId"]);
        if (error) throw error;
        const map: Settings = {};
        for (const row of (data as Array<{key:string;value:any}>) ?? []) {
          map[row.key as keyof Settings] = row.value?.value ?? row.value;
        }
        if (!cancelled) {
          setSettings(map);
          writeCache(map);
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const effective = useMemo<Required<Settings>>(() => ({
    siteName: settings?.siteName || SITE_NAME,
    siteUrl: settings?.siteUrl || SITE_URL,
    brandLogo: settings?.brandLogo || BRAND_LOGO,
    gaId: settings?.gaId || "",
  }), [settings]);

  return { settings: effective, raw: settings, loading, error };
}

export async function upsertSettings(values: Settings) {
  const rows = Object.entries(values)
    .filter(([,v]) => typeof v !== "undefined")
    .map(([k,v]) => ({ key: k, value: { value: v } }));
  if (!rows.length) return;
  const { error } = await (supabase as any).from("settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}
