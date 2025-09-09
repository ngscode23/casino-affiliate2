// netlify/functions/health.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const handler: Handler = async () => {
  const started = Date.now();
  const info: any = {
    ok: true,
    time: new Date().toISOString(),
    commit: process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || null,
  };
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      // lightweight ping: try select count(*) from settings (limited)
      const { error } = await (client as any).from('settings').select('key', { count: 'exact', head: true });
      info.supabase = { ok: !error };
    } else {
      info.supabase = { ok: false, reason: 'missing env' };
    }
  } catch (e:any) {
    info.ok = false;
    info.supabase = { ok: false };
  }
  info.duration_ms = Date.now() - started;
  return { statusCode: info.ok ? 200 : 500, headers: { 'content-type': 'application/json' }, body: JSON.stringify(info) };
};

export default handler;

