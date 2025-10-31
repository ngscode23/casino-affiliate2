#!/usr/bin/env tsx

import { createClient } from "@supabase/supabase-js";

const STATUSES_TO_REQUEUE = ["approved", "published"] as const;

function resolveConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET ||
    process.env.SUPABASE_ADMIN_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE (or SUPABASE_SECRET_KEY).",
    );
  }

  return { url, key };
}

async function requeueReviews() {
  const startedAt = Date.now();
  const { url, key } = resolveConfig();
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("product_reviews_raw")
    .update({ status: "pending" })
    .in("status", STATUSES_TO_REQUEUE)
    .select("product_id");

  if (error) {
    throw new Error(`Failed to update reviews: ${error.message}`);
  }

  const productsTouched = new Set<string>();
  for (const row of data ?? []) {
    if (typeof row.product_id === "string" && row.product_id.length > 0) {
      productsTouched.add(row.product_id);
    }
  }

  if (productsTouched.size > 0) {
    console.log(`Refreshing rating stats for ${productsTouched.size} products...`);
    for (const productId of productsTouched) {
      const { error: refreshError } = await supabase.rpc("refresh_product_rating_stats", {
        p_product_id: productId,
      });
      if (refreshError) {
        console.warn(`refresh_product_rating_stats failed for ${productId}: ${refreshError.message}`);
      }
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`Done. Re-queued ${data?.length ?? 0} reviews in ${elapsed}s.`);
}

requeueReviews().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
