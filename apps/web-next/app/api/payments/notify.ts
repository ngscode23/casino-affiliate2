import { getAdminClient } from "@/utils/supabase/admin";
import { markNotificationFlag, recordWebhookLog } from "./observability";

export type PaymentNotifyKind =
  | "succeeded"
  | "failed"
  | "refunded"
  | "desync"
  | "requires_action";

type NotifyPayload = {
  orderId: string;
  amountCents: number;
  currency: string;
  paymentIntentId?: string | null;
  webhookEventId?: string | null;
  userId?: string | null;
  reason?: string | null;
  expectedAmountCents?: number | null;
  expectedCurrency?: string | null;
  stripeAmountCents?: number | null;
  stripeCurrency?: string | null;
  refundId?: string | null;
  refundAmountCents?: number | null;
  refundReason?: string | null;
  chargeId?: string | null;
  notes?: string[];
};

function pickEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function resolveRecipients(userEmail: string | null): { to: string[]; bcc: string[] } {
  const toList = (pickEnv("PAYMENTS_NOTIFY_TO") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const bccList = (pickEnv("PAYMENTS_NOTIFY_BCC") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const sendToUser = process.env.PAYMENTS_NOTIFY_SEND_TO_USER === "1";
  if (sendToUser && userEmail) toList.push(userEmail);
  return { to: Array.from(new Set(toList)), bcc: Array.from(new Set(bccList)) };
}

async function fetchUserEmail(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) return null;
    return (data?.user?.email ?? null) as string | null;
  } catch {
    return null;
  }
}

function makeSubject(kind: PaymentNotifyKind, orderId: string): string {
  switch (kind) {
    case "succeeded":
      return `Payment succeeded - Order ${orderId}`;
    case "failed":
      return `Payment failed - Order ${orderId}`;
    case "refunded":
      return `Payment refunded - Order ${orderId}`;
    case "desync":
      return `Payment mismatch - Order ${orderId}`;
    case "requires_action":
      return `Payment requires action - Order ${orderId}`;
    default:
      return `Payment update - Order ${orderId}`;
  }
}

function formatAmount(amountCents: number, currency: string): string {
  const code = (currency || "USD").toUpperCase();
  const value = (amountCents || 0) / 100;
  return `${value.toFixed(2)} ${code}`;
}

function formatOptionalAmount(
  label: string,
  amountCents: number | null | undefined,
  currency: string | null | undefined
): string {
  if (!(amountCents && amountCents > 0)) return "";
  return `<p style="margin:0 0 8px">${label}: <b>${formatAmount(amountCents, currency || "USD")}</b></p>`;
}

function makeHtml(kind: PaymentNotifyKind, payload: NotifyPayload): string {
  let statusText = "Payment update";
  let color = "#2563eb";
  if (kind === "succeeded") {
    statusText = "Payment succeeded";
    color = "#16a34a";
  } else if (kind === "failed") {
    statusText = "Payment failed";
    color = "#dc2626";
  } else if (kind === "desync") {
    statusText = "Payment desync detected";
    color = "#f97316";
  } else if (kind === "refunded") {
    statusText = "Payment refunded";
    color = "#4f46e5";
  } else if (kind === "requires_action") {
    statusText = "Payment requires customer action";
    color = "#d97706";
  }

  const rows: string[] = [];
  rows.push(`<p style="margin:0 0 12px">Status: <b style="color:${color}">${statusText}</b></p>`);
  rows.push(`<p style="margin:0 0 8px">Order: <code>${payload.orderId}</code></p>`);
  rows.push(`<p style="margin:0 0 8px">Amount: <b>${formatAmount(payload.amountCents, payload.currency)}</b></p>`);

  if (kind === "desync") {
    const expected = formatOptionalAmount("Expected", payload.expectedAmountCents, payload.expectedCurrency);
    const actual = formatOptionalAmount(
      "Stripe reported",
      payload.stripeAmountCents,
      payload.stripeCurrency || payload.currency
    );
    if (expected) rows.push(expected);
    if (actual) rows.push(actual);
    if (payload.reason) rows.push(`<p style="margin:0 0 8px">Reason: <b>${payload.reason}</b></p>`);
  }

  if (kind === "refunded") {
    rows.push(
      formatOptionalAmount("Refund amount", payload.refundAmountCents ?? payload.amountCents, payload.currency)
    );
    if (payload.refundId) rows.push(`<p style="margin:0 0 8px">Refund ID: <code>${payload.refundId}</code></p>`);
    if (payload.refundReason || payload.reason) {
      rows.push(`<p style="margin:0 0 8px">Reason: <b>${payload.refundReason || payload.reason}</b></p>`);
    }
  } else if (payload.reason && kind !== "desync") {
    rows.push(`<p style="margin:0 0 8px">Reason: <b>${payload.reason}</b></p>`);
  }

  if (kind === "requires_action") {
    rows.push(
      `<p style="margin:0 0 8px">Next step: <b>${payload.reason || "Customer must complete additional steps"}</b></p>`
    );
  }

  if (payload.paymentIntentId) {
    rows.push(`<p style="margin:0 0 8px">PaymentIntent: <code>${payload.paymentIntentId}</code></p>`);
  }
  if (payload.chargeId) {
    rows.push(`<p style="margin:0 0 8px">Charge: <code>${payload.chargeId}</code></p>`);
  }
  if (payload.webhookEventId) {
    rows.push(`<p style="margin:0 0 8px">Event: <code>${payload.webhookEventId}</code></p>`);
  }
  if (Array.isArray(payload.notes) && payload.notes.length > 0) {
    const items = payload.notes.map((note) => `<li>${note}</li>`).join("");
    rows.push(`<ul style="margin:8px 0 12px 20px;color:#475569;padding:0">${items}</ul>`);
  }

  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto">${rows
    .filter(Boolean)
    .join(
      "\n"
    )}<hr style="margin:16px 0"/><p style="color:#64748b;font-size:12px">This message was generated automatically.</p></div>`;
}

async function sendViaPostmark(from: string, to: string[], bcc: string[], subject: string, html: string) {
  const token = pickEnv("POSTMARK_TOKEN", "POSTMARK_SERVER_TOKEN");
  if (!token) throw new Error("POSTMARK_TOKEN is not configured");
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ From: from, To: to.join(","), Bcc: bcc.join(","), Subject: subject, HtmlBody: html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`postmark ${res.status}: ${text}`);
  }
}

async function sendViaResend(from: string, to: string[], bcc: string[], subject: string, html: string) {
  const token = pickEnv("RESEND_API_KEY", "RESEND_KEY");
  if (!token) throw new Error("RESEND_API_KEY is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, bcc, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`resend ${res.status}: ${text}`);
  }
}

export async function notifyPayment(kind: PaymentNotifyKind, payload: NotifyPayload): Promise<void> {
  const provider = (pickEnv("PAYMENTS_NOTIFY_PROVIDER") || "none").toLowerCase();
  if (provider === "none" || !provider) return;

  const from = pickEnv("PAYMENTS_NOTIFY_FROM", "EMAIL_FROM");
  if (!from) return;

  const userEmail = await fetchUserEmail(payload.userId);
  const { to, bcc } = resolveRecipients(userEmail);
  if (to.length === 0) return;

  const subject = makeSubject(kind, payload.orderId);
  const html = makeHtml(kind, payload);

  try {
    if (provider === "postmark") {
      await sendViaPostmark(from, to, bcc, subject, html);
    } else if (provider === "resend") {
      await sendViaResend(from, to, bcc, subject, html);
    }
    void markNotificationFlag(payload.webhookEventId ?? null, `notified_${kind}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[payments][notify] send failed", {
      provider,
      orderId: payload.orderId,
      error: message,
    });
    void recordWebhookLog({
      type: "payments.notify.error",
      status: "error",
      eventId: payload.webhookEventId ?? null,
      source: "payments.notify",
      message,
      payload: {
        provider,
        orderId: payload.orderId,
        webhookEventId: payload.webhookEventId ?? null,
        kind,
      },
      error,
    });
  }
}
