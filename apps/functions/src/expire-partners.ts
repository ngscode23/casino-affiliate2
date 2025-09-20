// netlify/functions/expire-partners.ts
import type { Handler } from "@netlify/functions";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";

export const config = { schedule: "0 * * * *" }; // hourly

export const handler: Handler = async () => {
  const supabase = getServiceClient();
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

