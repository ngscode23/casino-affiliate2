import { NextRequest } from "next/server";
import nodemailer from "nodemailer";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { requireCronSecret } from "@/utils/cron/guard";

const MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 20;
const STALE_PROCESSING_MINUTES = 30;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "no-reply@example.com";

function getTransport() {
  if (!SMTP_HOST || !SMTP_PORT) {
    throw new Error("Missing SMTP env (SMTP_HOST/SMTP_PORT)");
  }
  if (!SMTP_USER || !SMTP_PASS) {
    // allow unauth SMTP (Mailhog/Mailcatcher)
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      tls: { rejectUnauthorized: false },
    });
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function calcNextSchedule(attempts: number) {
  if (attempts <= 1) return 5; // minutes
  if (attempts === 2) return 15;
  if (attempts === 3) return 60;
  return 180; // 3h for later retries
}

export async function POST(request: NextRequest) {
  // allow admin or cron secret
  const hasCronHeader = Boolean(request.headers.get("x-cron-secret"));
  if (hasCronHeader) {
    const cronAuth = requireCronSecret(request);
    if (!cronAuth.ok) return json({ ok: false, error: cronAuth.error }, cronAuth.status);
  } else {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;
  }

  let transport;
  try {
    transport = getTransport();
  } catch (err: any) {
    return json({ ok: false, error: "smtp_config_invalid", message: err?.message }, 500);
  }

  const supabase = getAdminClient();
  const { count: totalPending } = await supabase
    .from("email_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { data: rows, error } = await supabase.rpc("email_outbox_claim_batch", {
    p_limit: BATCH_LIMIT,
    p_stale_minutes: STALE_PROCESSING_MINUTES,
  });

  if (error) return json({ ok: false, error: "claim_failed", message: error.message }, 500);
  if (!rows || !rows.length) return json({ ok: true, total_pending: totalPending ?? 0, eligible: 0, processed: 0 }, 200);

  let sent = 0;
  const results: Array<{ id: string; status: string }> = [];

  for (const row of rows) {
    const id = (row as any).id as string;
    const to = (row as any).to_email as string;
    const payload = (row as any).payload as Record<string, any>;
    const attempts = (row as any).attempts as number;

    try {
      const subject = buildSubject(row.type, payload);
      const text = buildText(row.type, payload);
      await transport.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        text,
      });

      await supabase
        .from("email_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", id)
        .eq("status", "processing");
      sent += 1;
      results.push({ id, status: "sent" });
    } catch (err: any) {
      const nextMinutes = calcNextSchedule(attempts);
      const nextTime = new Date(Date.now() + nextMinutes * 60 * 1000).toISOString();
      await supabase
        .from("email_outbox")
        .update({
          last_error: err?.message ?? String(err),
          scheduled_at: nextTime,
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        })
        .eq("id", id)
        .eq("status", "processing");
      results.push({ id, status: "retry" });
    }
  }

  return json({
    ok: true,
    total_pending: totalPending ?? 0,
    eligible: rows.length,
    processed: rows.length,
    sent,
    results,
  }, 200);
}

function buildSubject(type: string, payload: Record<string, any>): string {
  switch (type) {
    case "tracking_update":
      return `Your order ${payload.order_id} tracking update`;
    default:
      return "Notification";
  }
}

function buildText(type: string, payload: Record<string, any>): string {
  if (type === "tracking_update") {
    const parts = [
      `Order: ${payload.order_id ?? "-"}`,
      `Status: ${payload.status ?? "-"}`,
      `Carrier: ${payload.carrier ?? "-"}`,
      `Tracking number: ${payload.tracking_number ?? "-"}`,
      `Tracking URL: ${payload.tracking_url ?? "-"}`,
      payload.eta ? `ETA: ${payload.eta}` : null,
    ].filter(Boolean);
    return parts.join("\n");
  }
  return JSON.stringify(payload, null, 2);
}
