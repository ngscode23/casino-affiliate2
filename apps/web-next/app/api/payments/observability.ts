import { getAdminClient } from "@/utils/supabase/admin";

declare const __non_webpack_require__: NodeRequire | undefined;

type SupabaseAdmin = ReturnType<typeof getAdminClient>;

export type WebhookLogStatus = "info" | "warning" | "error" | "pending_manual_review";

let sentryInitAttempted = false;
let cachedSentry: any | null = null;

async function ensureSentry(): Promise<any | null> {
  if (sentryInitAttempted) return cachedSentry;
  sentryInitAttempted = true;

  const dsn =
    process.env.SENTRY_DSN ||
    process.env.SENTRY_SERVER_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "";
  if (!dsn.trim()) {
    cachedSentry = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore optional dependency
    const nodeRequire: NodeRequire =
      typeof __non_webpack_require__ === "function"
        ? __non_webpack_require__
        : (eval("require") as NodeRequire);
    const mod = nodeRequire("@sentry/node") as typeof import("@sentry/node");
    const env =
      process.env.APP_ENV ||
      process.env.NEXT_PUBLIC_APP_ENV ||
      process.env.NODE_ENV ||
      "production";

    try {
      const hub = typeof mod.getCurrentHub === "function" ? mod.getCurrentHub() : null;
      const client = hub && typeof hub.getClient === "function" ? hub.getClient() : null;
      if (!client && typeof mod.init === "function") {
        mod.init({ dsn, environment: env, tracesSampleRate: 0 });
      }
    } catch (error) {
      console.warn("[payments][metrics] sentry init failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    cachedSentry = mod;
    return cachedSentry;
  } catch (error) {
    console.warn("[payments][metrics] sentry unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
    cachedSentry = null;
    return null;
  }
}

export async function emitPaymentMetric(
  event: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const data = JSON.parse(JSON.stringify(details ?? {}));
  console.info("[payments][metric]", { event, ...data });

  try {
    const sentry = await ensureSentry();
    if (sentry?.addBreadcrumb) {
      sentry.addBreadcrumb({
        category: "payments.webhook",
        message: event,
        level: "info",
        data,
      });
    }
  } catch (error) {
    console.warn("[payments][metric] breadcrumb error", {
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

type RecordWebhookLogOptions = {
  type: string;
  eventId?: string | null;
  status?: WebhookLogStatus;
  httpStatus?: number | null;
  source?: string | null;
  message?: string | null;
  payload?: Record<string, unknown>;
  error?: unknown;
  supabase?: SupabaseAdmin;
};

function normalizeError(input: unknown): Record<string, unknown> | null {
  if (!input) return null;
  if (input instanceof Error) {
    return {
      message: input.message,
      stack: input.stack,
      name: input.name,
    };
  }
  if (typeof input === "object") {
    try {
      return JSON.parse(JSON.stringify(input));
    } catch {
      return { value: String(input) };
    }
  }
  return { value: String(input) };
}

export async function recordWebhookLog(options: RecordWebhookLogOptions): Promise<void> {
  const {
    type,
    eventId = null,
    status = "info",
    httpStatus = null,
    source = "payments",
    message,
    payload,
    error,
    supabase: providedSupabase,
  } = options;

  const supabase = providedSupabase ?? getAdminClient();
  const normalizedError = normalizeError(error);
  const normalizedPayload =
    payload && Object.keys(payload).length > 0
      ? JSON.parse(JSON.stringify(payload))
      : null;

  try {
    await supabase.from("webhook_logs_app").insert({
      event_id: eventId,
      event_type: type,
      log_status: status,
      http_status: httpStatus,
      source,
      message: message ?? null,
      error:
        normalizedError || normalizedPayload
          ? { ...(normalizedError ? { error: normalizedError } : {}), ...(normalizedPayload ? { payload: normalizedPayload } : {}) }
          : null,
    });
  } catch (insertError) {
    console.warn("[payments][webhook_log] insert failed", {
      type,
      status,
      error: insertError instanceof Error ? insertError.message : String(insertError),
    });
  }
}

export async function markNotificationFlag(
  eventId: string | null | undefined,
  flag: string,
  supabase?: SupabaseAdmin
): Promise<void> {
  const normalized = (eventId || "").trim();
  if (!normalized) return;

  const client = supabase ?? getAdminClient();
  try {
    await client.from("stripe_webhooks").update({ [flag]: true }).eq("id", normalized);
  } catch (error) {
    console.warn("[payments][webhook] failed to mark notification flag", {
      eventId: normalized,
      flag,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
