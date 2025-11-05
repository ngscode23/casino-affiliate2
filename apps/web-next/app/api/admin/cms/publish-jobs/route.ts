import { revalidatePath } from "next/cache";

import { json } from "@/app/api/orders/utils";
import { getAdminClient } from "@/utils/supabase/admin";
import { revalidate as revalidateTag } from "@/lib/cache";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim() ?? "";
const MAX_BATCH = Number(process.env.CMS_PUBLISH_MAX_BATCH ?? 20);
const MAX_ATTEMPTS = Number(process.env.CMS_PUBLISH_MAX_ATTEMPTS ?? 5);
const RETRY_DELAY_MS = Number(process.env.CMS_PUBLISH_RETRY_MS ?? 60_000);
const LOCK_WINDOW_MS = Number(process.env.CMS_PUBLISH_LOCK_MS ?? 120_000);

type PublishJob = {
  id: string;
  target: string | null;
  action: string | null;
  payload: Record<string, any> | null;
  status: string;
  attempts: number;
  scheduled_at: string | null;
};

function validateToken(request: Request) {
  if (!ADMIN_TOKEN) {
    return json(
      { ok: false, code: "misconfig", message: "ADMIN_TOKEN missing" },
      500,
    );
  }

  const headerToken =
    request.headers.get("x-admin-token") ??
    request.headers.get("X-Admin-Token") ??
    "";
  if (headerToken.trim() !== ADMIN_TOKEN) {
    return json({ ok: false, code: "unauthorized" }, 403);
  }

  return null;
}

function parseTarget(raw: string | null) {
  if (!raw) return { kind: "unknown" as const, value: null };
  if (raw.startsWith("tag:")) return { kind: "tag" as const, value: raw.slice(4) };
  if (raw.startsWith("page:")) return { kind: "path" as const, value: raw.slice(5) || "/" };
  if (raw.startsWith("path:")) return { kind: "path" as const, value: raw.slice(5) || "/" };
  if (raw.startsWith("webhook:")) return { kind: "webhook" as const, value: raw.slice(8) };
  return { kind: "tag" as const, value: raw };
}

async function performRevalidate(target: string | null) {
  const parsed = parseTarget(target);
  if (parsed.kind === "tag") {
    if (!parsed.value) throw new Error("empty_tag");
    await revalidateTag(parsed.value);
    return { type: "tag", key: parsed.value };
  }
  if (parsed.kind === "path") {
    if (!parsed.value) throw new Error("empty_path");
    await revalidatePath(parsed.value, "page");
    return { type: "path", key: parsed.value };
  }
  throw new Error(`unsupported_target:${target ?? "null"}`);
}

async function triggerWebhook(target: string | null, payload: Record<string, any> | null) {
  const parsed = parseTarget(target);
  const url =
    payload?.url ??
    (parsed.kind === "webhook" ? parsed.value : parsed.kind === "tag" ? parsed.value : null);
  if (!url) {
    throw new Error("webhook_url_missing");
  }

  const method = (payload?.method ?? "POST").toUpperCase();
  const headers: Record<string, string> = {};
  if (payload?.headers && typeof payload.headers === "object") {
    for (const [key, value] of Object.entries(payload.headers)) {
      if (typeof value === "string") headers[key] = value;
    }
  }
  if (!headers["content-type"] && payload?.body && typeof payload.body === "object") {
    headers["content-type"] = "application/json";
  }

  const body =
    typeof payload?.body === "string"
      ? payload.body
      : payload?.body && typeof payload.body === "object"
        ? JSON.stringify(payload.body)
        : undefined;

  const response = await fetch(url, {
    method,
    headers,
    body,
    redirect: "follow",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`webhook_${response.status}:${text.slice(0, 240)}`);
  }

  return { type: "webhook", key: url, status: response.status };
}

async function lockJob(supabase: ReturnType<typeof getAdminClient>, job: PublishJob) {
  const now = Date.now();
  const lockUntil = new Date(now + LOCK_WINDOW_MS).toISOString();
  const nextAttempts = job.attempts + 1;

  const { data, error } = await supabase
    .from("publish_jobs")
    .update({
      scheduled_at: lockUntil,
      attempts: nextAttempts,
    })
    .eq("id", job.id)
    .eq("status", "pending")
    .lte("scheduled_at", new Date(now + 1_000).toISOString())
    .select("id, attempts")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data.attempts ?? nextAttempts;
}

async function markSuccess(
  supabase: ReturnType<typeof getAdminClient>,
  job: PublishJob,
  log: Record<string, unknown>,
) {
  await supabase
    .from("publish_jobs")
    .update({
      status: "sent",
      executed_at: new Date().toISOString(),
      last_error: null,
      payload: job.payload,
    })
    .eq("id", job.id);
  return log;
}

async function markFailure(
  supabase: ReturnType<typeof getAdminClient>,
  job: PublishJob,
  attempts: number,
  error: unknown,
) {
  const errorMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  const shouldFail = attempts >= MAX_ATTEMPTS;
  await supabase
    .from("publish_jobs")
    .update({
      status: shouldFail ? "failed" : "pending",
      scheduled_at: shouldFail
        ? new Date().toISOString()
        : new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
      executed_at: new Date().toISOString(),
      last_error: errorMessage.slice(0, 500),
    })
    .eq("id", job.id);
}

export async function POST(request: Request) {
  const authError = validateToken(request);
  if (authError) return authError;

  const supabase = getAdminClient();
  const nowIso = new Date().toISOString();
  const { data: jobs, error } = await supabase
    .from("publish_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(MAX_BATCH);

  if (error) {
    return json({ ok: false, code: "db", message: error.message }, 500);
  }

  if (!jobs || jobs.length === 0) {
    return json({ ok: true, processed: 0 });
  }

  const results: Array<Record<string, unknown>> = [];
  let processed = 0;
  let failures = 0;

  for (const job of jobs as PublishJob[]) {
    let attempts: number | null = null;
    try {
      attempts = await lockJob(supabase, job);
      if (!attempts) continue; // job already handled by other worker

      const action = job.action ?? "revalidate";
      let log: Record<string, unknown> | null = null;

      switch (action) {
        case "revalidate":
          log = await performRevalidate(job.target);
          break;
        case "webhook":
          log = await triggerWebhook(job.target, job.payload ?? {});
          break;
        default:
          throw new Error(`unsupported_action:${action}`);
      }

      if (log) log.jobId = job.id;
      results.push(await markSuccess(supabase, job, log ?? { jobId: job.id }));
      processed += 1;
    } catch (err) {
      failures += 1;
      if (attempts != null) {
        await markFailure(supabase, job, attempts, err);
      }
      results.push({
        jobId: job.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return json({
    ok: true,
    processed,
    failures,
    jobs: results,
  });
}

export function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
