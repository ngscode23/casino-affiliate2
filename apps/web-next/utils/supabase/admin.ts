import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function resolveConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client");
  }
  return { url, key };
}

export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const { url, key } = resolveConfig();
    adminClient = createClient(url, key, {
      auth: {
        persistSession: false,
      },
    });
  }
  return adminClient;
}
