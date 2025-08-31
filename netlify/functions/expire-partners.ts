// netlify/functions/expire-partners.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export const config = { schedule: "0 2 * * *" }; // daily 02:00 UTC

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const handler: Handler = async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: "Supabase not configured" };
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  try {
    // Set pinned=false for expired partners
    const { error } = await supabase.rpc("expire_partner_pins");
    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false }) };
  }
};

export default handler;
