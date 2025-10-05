import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../../src/lib/database.types";

const supabaseUrl = (() => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL is not configured");
  return url;
})();

const supabaseSecretKey = (() => {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not configured");
  return key;
})();

type ServiceClient = SupabaseClient<Database, any, any>;

let serviceClient: ServiceClient | null = null;

function instantiateClient(overrides?: { headers?: Record<string, string> }): ServiceClient {
  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false },
    global: overrides?.headers ? { headers: overrides.headers } : undefined,
  }) as ServiceClient;
}

export function getServiceClient(): ServiceClient {
  if (!serviceClient) {
    serviceClient = instantiateClient();
  }
  return serviceClient;
}

export function createUserClient(accessToken: string): ServiceClient {
  return instantiateClient({ headers: { Authorization: `Bearer ${accessToken}` } });
}

