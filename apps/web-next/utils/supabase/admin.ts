import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseFetchLogger } from "./fetch-logger";

type AnySchemaClient = SupabaseClient<any, any>;

let adminClient: AnySchemaClient | null = null;
const adminClientsBySchema = new Map<string, AnySchemaClient>();
const adminFetch = createSupabaseFetchLogger("admin", console.info, {
  retries: 2,
  baseDelayMs: 300,
});

function resolveConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Prefer new API names; fall back to legacy
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin env: set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE)"
    );
  }
  return { url, key };
}

type ClientSchema = string | undefined | null;

function createAdminClient(schema?: string): AnySchemaClient {
  const { url, key } = resolveConfig();
  return createClient<any, any>(url, key, {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: adminFetch,
    },
    ...(schema ? { db: { schema } } : null),
  });
}

export function getAdminClient(schema?: ClientSchema): AnySchemaClient {
  const normalizedSchema = schema && schema !== "public" ? schema : null;
  if (!normalizedSchema) {
    if (!adminClient) {
      adminClient = createAdminClient();
    }
    return adminClient;
  }
  if (!adminClientsBySchema.has(normalizedSchema)) {
    adminClientsBySchema.set(normalizedSchema, createAdminClient(normalizedSchema));
  }
  return adminClientsBySchema.get(normalizedSchema)!;
}
