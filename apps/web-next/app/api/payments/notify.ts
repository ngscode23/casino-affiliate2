import { getAdminClient } from "@/utils/supabase/admin";

export type PaymentNotifyKind = "succeeded" | "failed";

type NotifyPayload = {
  orderId: string;
  amountCents: number;
  currency: string;
  paymentIntentId?: string | null;
  webhookEventId?: string | null;
  userId?: string | null;
};

function pickEnv(...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function resolveRecipients(userEmail: string | null): { to: string[]; bcc: string[] } {
  const toList = (pickEnv("PAYMENTS_NOTIFY_TO") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const bccList = (pickEnv("PAYMENTS_NOTIFY_BCC") || "").split(",").map((s) => s.trim()).filter(Boolean);
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
  return kind === "succeeded"
    ? `Payment succeeded · Order ${orderId}`
    : `Payment failed · Order ${orderId}`;
}

function formatAmount(amountCents: number, currency: string): string {
  const code = (currency || "USD").toUpperCase();
  const value = (amountCents || 0) / 100;
  return `${value.toFixed(2)} ${code}`;
}

function makeHtml(kind: PaymentNotifyKind, p: NotifyPayload): string {
  const statusText = kind === "succeeded" ? "Payment succeeded" : "Payment failed";
  const color = kind === "succeeded" ? "#16a34a" : "#dc2626";
  const amount = formatAmount(p.amountCents, p.currency);
  const rows = [
    `<p style="margin:0 0 12px">Status: <b style="color:${color}">${statusText}</b></p>`,
    `<p style="margin:0 0 8px">Order: <code>${p.orderId}</code></p>`,
    `<p style="margin:0 0 8px">Amount: <b>${amount}</b></p>`,
    p.paymentIntentId ? `<p style="margin:0 0 8px">PaymentIntent: <code>${p.paymentIntentId}</code></p>` : "",
    p.webhookEventId ? `<p style="margin:0 0 8px">Event: <code>${p.webhookEventId}</code></p>` : "",
  ].filter(Boolean);
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto">${rows.join("\n")}<hr style="margin:16px 0"/><p style="color:#64748b;font-size:12px">This message was generated automatically.</p></div>`;
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
  if (provider === "none" || !provider) return; // disabled

  const from = pickEnv("PAYMENTS_NOTIFY_FROM", "EMAIL_FROM");
  if (!from) return; // missing config — skip silently

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
  } catch (err) {
    // Do not fail the webhook/API on notification errors
    console.warn("[payments][notify] send failed", {
      provider,
      orderId: payload.orderId,
      error: (err as Error).message,
    });
  }
}

