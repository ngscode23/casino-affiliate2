import { json } from "../../../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const supabase = getAdminClient();
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();

    // Try RPC first if present
    const { error: rpcError } = (await (supabase as any).rpc("purge_webhook_logs", { cutoff_ts: cutoff })) as any;
    if (!rpcError) return json({ ok: true, via: "rpc" });

    // Fallback: direct delete (admin client)
    const { error: delError } = await supabase.from("webhook_logs").delete().lt("created_at", cutoff);
    if (delError) return json({ ok: false, code: "db", message: delError.message }, 500);

    return json({ ok: true, via: "delete" });
  } catch (err: any) {
    return json({ ok: false, code: "internal", message: String(err?.message ?? err) }, 500);
  }
}

