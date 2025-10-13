import { json } from "../../../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN?.trim() ?? "";
  const headerToken =
    (request.headers.get("x-admin-token") || request.headers.get("X-Admin-Token") || "").trim();

  if (!adminToken || headerToken !== adminToken) {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;
  }

  try {
    const supabase = getAdminClient();
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();

    // Try RPC first if present
    const { error: logsRpcError } = (await (supabase as any).rpc("purge_webhook_logs", { cutoff_ts: cutoff })) as any;
    const { error: processedRpcError } = (await (supabase as any).rpc("purge_processed_events", { cutoff_ts: cutoff })) as any;
    if (!logsRpcError && !processedRpcError) {
      return json({ ok: true, via: "rpc" });
    }

    const warnings: string[] = [];

    if (logsRpcError) {
      const { error: delError } = await supabase.from("webhook_logs_app").delete().lt("created_at", cutoff);
      if (delError) {
        return json({ ok: false, code: "db", message: delError.message }, 500);
      }
      warnings.push("webhook_logs_rpc_failed");
    }

    if (processedRpcError) {
      const { error: processedDelError } = await supabase.from("processed_events").delete().lt("created_at", cutoff);
      if (processedDelError) {
        return json({ ok: false, code: "db", message: processedDelError.message }, 500);
      }
      warnings.push("processed_events_rpc_failed");
    }

    return json({ ok: true, via: "delete", warnings: warnings.length ? warnings : undefined });
  } catch (err: any) {
    return json({ ok: false, code: "internal", message: String(err?.message ?? err) }, 500);
  }
}
