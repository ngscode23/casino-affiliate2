// netlify/functions/cleanup-clicks.ts
// Scheduled cleanup of old click logs to enforce retention
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export const config = {
  schedule: "0 3 * * *", // every day at 03:00 UTC
};

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const handler: Handler = async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: "Missing Supabase env" };
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    const days = Number(process.env.CLICKS_RETENTION_DAYS || 90);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { error } = await supabase.rpc("cleanup_clicks_before", { cutoff_ts: cutoff.toISOString() });
    if (error) throw error;
    return { statusCode: 200, body: "ok" };
  } catch (e: any) {
    return { statusCode: 500, body: String(e?.message || e) };
  }
};

export default handler;

