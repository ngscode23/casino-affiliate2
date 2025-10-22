const baseFetch =
  typeof fetch === "function" ? fetch.bind(globalThis) : null;

function now(): number {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
}

function extractUrl(input: RequestInfo | URL): string {
  try {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    if (typeof Request !== "undefined" && input instanceof Request) {
      return input.url;
    }
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

export type SupabaseFetchLogger = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function createSupabaseFetchLogger(label: string, log: (message: string) => void = console.info): SupabaseFetchLogger {
  if (!baseFetch) {
    throw new Error("Global fetch is not available for Supabase instrumentation.");
  }

  return async function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const startedAt = now();
    const method = (init?.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = extractUrl(input);
    let statusText = "error";
    let response: Response | null = null;

    try {
      response = await baseFetch(input, init);
      statusText = String(response.status);
      return response;
    } catch (error) {
      statusText = (error as Error)?.name ?? "error";
      throw error;
    } finally {
      const durationMs = now() - startedAt;
      const formattedMs = durationMs < 1 ? `${durationMs.toFixed(3)}ms` : `${durationMs.toFixed(1)}ms`;
      log(`[supabase:${label}] ${method} ${shorten(url)} → ${statusText} in ${formattedMs}`);
    }
  };
}
