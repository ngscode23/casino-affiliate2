import { getAdminClient } from "@/utils/supabase/admin";

type ReviewReplyNotifyPayload = {
  reviewOwnerId: string | null;
  productId: string | null;
  replyBody: string;
};

function pickEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
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

async function shouldNotifyReviewReplies(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("notify_review_replies")
      .eq("id", userId)
      .maybeSingle<{ notify_review_replies: boolean | null }>();

    if (error) {
      // Fail-open: если не удалось прочитать профиль, не блокируем уведомление.
      return true;
    }

    if (data && data.notify_review_replies === false) {
      return false;
    }

    return true;
  } catch {
    // При ошибке чтения профиля безопаснее не блокировать письмо.
    return true;
  }
}

async function loadProductInfo(
  productId: string | null | undefined,
): Promise<{ slug: string | null; title: string | null }> {
  if (!productId) return { slug: null, title: null };
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("v_products_flat")
      .select("slug, title")
      .eq("id", productId)
      .maybeSingle<{ slug: string | null; title: string | null }>();
    if (error || !data) return { slug: null, title: null };
    return { slug: data.slug, title: data.title };
  } catch {
    return { slug: null, title: null };
  }
}

async function sendViaPostmark(from: string, to: string[], subject: string, html: string) {
  const token = pickEnv("POSTMARK_TOKEN", "POSTMARK_SERVER_TOKEN");
  if (!token) throw new Error("POSTMARK_TOKEN is not configured");
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ From: from, To: to.join(","), Subject: subject, HtmlBody: html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`postmark ${res.status}: ${text}`);
  }
}

async function sendViaResend(from: string, to: string[], subject: string, html: string) {
  const token = pickEnv("RESEND_API_KEY", "RESEND_KEY");
  if (!token) throw new Error("RESEND_API_KEY is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`resend ${res.status}: ${text}`);
  }
}

export async function notifyReviewReplyEmail(payload: ReviewReplyNotifyPayload): Promise<void> {
  try {
    if (!payload.reviewOwnerId) return;

    const wantsEmail = await shouldNotifyReviewReplies(payload.reviewOwnerId);
    if (!wantsEmail) return;

    const email = await fetchUserEmail(payload.reviewOwnerId);
    if (!email) return;

    const provider = (pickEnv("REVIEWS_NOTIFY_PROVIDER") || "none").toLowerCase();
    if (!provider || provider === "none") return;

    const from = pickEnv("REVIEWS_NOTIFY_FROM", "EMAIL_FROM");
    if (!from) return;

    const origin =
      (process.env.NEXT_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(
        /\/$/,
        "",
      );

    const { slug, title } = await loadProductInfo(payload.productId);
    const productUrl = origin && slug ? `${origin}/products/${slug}` : origin || "";

    const safeTitle = title || "товаре";
    const subject = `Вам ответили на отзыв о ${safeTitle}`;

    const bodyHtml = (() => {
      const reply = (payload.replyBody || "").replace(/\n/g, "<br/>");
      const link =
        productUrl && slug
          ? `<p style="margin:16px 0 0"><a href="${productUrl}" style="color:#2563eb;text-decoration:none">Перейти к товару</a></p>`
          : "";
      return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto">
  <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a">Вам ответили на отзыв</h2>
  <p style="margin:0 0 8px;color:#1e293b">На ваш отзыв о ${safeTitle} появился новый ответ:</p>
  <div style="margin:8px 0 16px;padding:12px;border-radius:12px;background:#f8fafc;color:#1e293b;line-height:1.5">${reply}</div>
  ${link}
  <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0"/>
  <p style="margin:0;color:#94a3b8;font-size:12px">Вы получаете это письмо, потому что оставляли отзыв и включили уведомления об ответах.</p>
</div>`;
    })();

    const to = [email];
    if (provider === "postmark") {
      await sendViaPostmark(from, to, subject, bodyHtml);
    } else if (provider === "resend") {
      await sendViaResend(from, to, subject, bodyHtml);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[reviews-admin][notifyReviewReplyEmail] send failed", { error: message });
  }
}

