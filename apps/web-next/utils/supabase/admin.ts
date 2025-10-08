import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function resolveConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Prefer new API names; fall back to legacy
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin env: set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE)"
    );
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
