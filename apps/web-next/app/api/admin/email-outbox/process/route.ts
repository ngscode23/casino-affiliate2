import { NextRequest } from "next/server";
import nodemailer from "nodemailer";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 20;

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
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");
  const fromCron = cronSecret && headerSecret && cronSecret === headerSecret;
  if (!fromCron) {
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
  const nowIso = new Date().toISOString();
  const { count: totalPending } = await supabase
    .from("email_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { data: rows, error } = await supabase
    .from("email_outbox")
    .select("id, type, to_email, payload, attempts")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .lt("attempts", MAX_ATTEMPTS)
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
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
        .update({ status: "sent", sent_at: new Date().toISOString(), attempts: attempts + 1, last_error: null })
        .eq("id", id);
      sent += 1;
      results.push({ id, status: "sent" });
    } catch (err: any) {
      const nextMinutes = calcNextSchedule(attempts + 1);
      const nextTime = new Date(Date.now() + nextMinutes * 60 * 1000).toISOString();
      await supabase
        .from("email_outbox")
        .update({
          attempts: attempts + 1,
          last_error: err?.message ?? String(err),
          scheduled_at: nextTime,
          status: attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending",
        })
        .eq("id", id);
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
