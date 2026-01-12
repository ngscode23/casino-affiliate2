import { NextRequest } from "next/server";

import { json } from "@/app/api/orders/utils";
import { getAdminClient } from "@/utils/supabase/admin";
import { requireCronSecret } from "@/utils/cron/guard";

const RUN_ENDPOINT = "/api/admin/supplier-feed/run";

export async function POST(request: NextRequest) {
  const cronAuth = requireCronSecret(request);
  if (!cronAuth.ok) return json({ ok: false, error: cronAuth.error }, cronAuth.status);

  const supabase = getAdminClient();
  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("id")
    .eq("status", "active");

  if (error) return json({ ok: false, error: "fetch_suppliers_failed", message: error.message }, 500);
  if (!suppliers || !suppliers.length) return json({ ok: true, message: "no_active_suppliers" }, 200);

  const origin = new URL(request.url);
  const baseUrl = `${origin.protocol}//${origin.host}`;

  const results: Array<{ supplier_id: string; status: string }> = [];
  for (const row of suppliers) {
    const supplierId = (row as any).id as string;
    try {
      const res = await fetch(`${baseUrl}${RUN_ENDPOINT}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cron-secret": process.env.CRON_SECRET!,
        },
        body: JSON.stringify({ supplier_id: supplierId, miss_threshold: 3, mode: "remote" }),
      });
      results.push({ supplier_id: supplierId, status: res.ok ? "queued" : `error_${res.status}` });
    } catch (err) {
      results.push({ supplier_id: supplierId, status: "error" });
    }
  }

  return json({ ok: true, results }, 200);
}
