#!/usr/bin/env tsx

import { createClient } from "@supabase/supabase-js";

function resolveConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET ||
    process.env.SUPABASE_ADMIN_KEY;

  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE (service key) in env");
  }
  return { url, key };
}

async function main() {
  const { url, key } = resolveConfig();
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: raw, error: rawError } = await supabase
    .from("product_reviews_raw")
    .select("product_id, user_id, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (rawError) {
    throw new Error(`raw query failed: ${rawError.message}`);
  }

  console.log("product_reviews_raw (latest 10):");
  console.table(raw ?? []);

  const { data: adminView, error: adminError } = await supabase
    .from("product_reviews_admin_v")
    .select("id, status, product_uid, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (adminError) {
    throw new Error(`admin view query failed: ${adminError.message}`);
  }

  console.log("product_reviews_admin_v (latest 10):");
  console.table(adminView ?? []);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
