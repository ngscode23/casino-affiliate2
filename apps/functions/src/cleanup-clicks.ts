// netlify/functions/cleanup-clicks.ts
// Scheduled cleanup of old click logs to enforce retention
import type { Handler } from "@netlify/functions";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";

export const config = {
  schedule: "0 3 * * *", // every day at 03:00 UTC
};

export const handler: Handler = async () => {
  const supabase = getServiceClient();

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


