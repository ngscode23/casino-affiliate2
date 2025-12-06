const baseFetch = typeof fetch === "function" ? fetch.bind(globalThis) : null;

type SupabaseFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type SupabaseFetchOptions = {
  retries?: number;
  baseDelayMs?: number;
  retryStatus?: number[];
  retryableMethods?: string[];
  maxConcurrency?: number;
  logger?: {
    info?: (message: string) => void;
    warn?: (message: string, error?: unknown) => void;
    error?: (message: string, error?: unknown) => void;
  };
};

const DEFAULT_RETRYABLE_STATUS = [429, 500, 502, 503, 504];
const DEFAULT_RETRYABLE_METHODS = ["GET", "HEAD"];

const now = () =>
  typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatMs(durationMs: number): string {
  return durationMs < 1 ? `${durationMs.toFixed(3)}ms` : `${durationMs.toFixed(1)}ms`;
}

function extractUrl(input: RequestInfo | URL): string {
  try {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  } catch {
    // ignore
  }
  return "[unknown]";
}

function shorten(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname + (parsed.search || "");
    return `${parsed.host}${path}`;
  } catch {
    return url;
  }
}

function computeDelay(
  attempt: number,
  baseDelayMs: number,
  retryAfterHeader: string | null
): number {
  const retryAfterSeconds = Number(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  const jitter = Math.random() * 50;
  return baseDelayMs * 2 ** attempt + jitter;
}

// Shared keep-alive agent for Node.js runtime to reuse sockets to Supabase.
// In browsers we skip the agent to avoid bundling Node-specific modules.
const supabaseAgent: any = null;

export type SupabaseFetchLogger = SupabaseFetch;

export function createSupabaseFetchLogger(
  label: string,
  log: (message: string) => void = console.info,
  options: SupabaseFetchOptions = {}
): SupabaseFetchLogger {
  if (!baseFetch) {
    throw new Error("Global fetch is not available for Supabase instrumentation.");
  }

  const retries = Math.max(0, options.retries ?? 2);
  const baseDelayMs = options.baseDelayMs ?? 200;
  const retryStatus = options.retryStatus ?? DEFAULT_RETRYABLE_STATUS;
  const retryableMethods = new Set(
    (options.retryableMethods ?? DEFAULT_RETRYABLE_METHODS).map((m) => m.toUpperCase())
  );
  const maxConcurrency = Math.max(0, options.maxConcurrency ?? 8);
  let active = 0;
  const queue: Array<() => void> = [];

  const acquire = async () => {
    if (maxConcurrency === 0) return;
    if (active >= maxConcurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active += 1;
  };

  const release = () => {
    if (maxConcurrency === 0) return;
    active = Math.max(0, active - 1);
    const next = queue.shift();
    next?.();
  };

  const logger = {
    info: options.logger?.info ?? log,
    warn: options.logger?.warn ?? console.warn,
    error: options.logger?.error ?? console.error,
  };

  return async function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = extractUrl(input);
    const method =
      (init?.method ||
        (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")
      ).toUpperCase();

    await acquire();

    let attempt = 0;
    while (true) {
      const startedAt = now();
      let statusText = "error";

      try {
        const response = await baseFetch(
          input,
          {
            ...init,
            // Prefer shared keep-alive agent on the server; respect custom dispatcher if provided
            dispatcher: (init as any)?.dispatcher ?? supabaseAgent ?? undefined,
          } as RequestInit
        );
        statusText = String(response.status);
        const durationMs = now() - startedAt;
        const shouldRetry =
          retryableMethods.has(method) &&
          retryStatus.includes(response.status) &&
          attempt < retries;

        if (!shouldRetry) {
          logger.info(`[supabase:${label}] ${method} ${shorten(url)} → ${statusText} in ${formatMs(durationMs)}`);
          release();
          return response;
        }

        // Drain the body to free resources before retrying
        response.body?.cancel?.();
        const delayMs = computeDelay(attempt, baseDelayMs, response.headers.get("retry-after"));
        logger.warn(
          `[supabase:${label}] ${method} ${shorten(url)} → ${statusText} in ${formatMs(
            durationMs
          )}; retry ${attempt + 1}/${retries} in ${Math.round(delayMs)}ms`
        );

        attempt += 1;
        await delay(delayMs);
        continue;
      } catch (error) {
        statusText = (error as Error)?.name ?? "error";
        const durationMs = now() - startedAt;
        const canRetry = retryableMethods.has(method) && attempt < retries;

        if (!canRetry) {
          logger.error(
            `[supabase:${label}] ${method} ${shorten(url)} failed after ${attempt + 1} attempt(s): ${statusText} (${formatMs(
              durationMs
            )})`,
            error
          );
          release();
          throw error;
        }

        const delayMs = computeDelay(attempt, baseDelayMs, null);
        logger.warn(
          `[supabase:${label}] ${method} ${shorten(url)} failed (${statusText}) in ${formatMs(
            durationMs
          )}; retry ${attempt + 1}/${retries} in ${Math.round(delayMs)}ms`,
          error
        );

        attempt += 1;
        await delay(delayMs);
      }
    }
  };
}
