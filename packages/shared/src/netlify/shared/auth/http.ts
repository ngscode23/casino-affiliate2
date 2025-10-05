export interface JsonResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export function json(body: unknown, statusCode = 200, headers?: Record<string, string>): JsonResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function error(statusCode: number, code: string, message: string): JsonResponse {
  return json({ ok: false, code, message }, statusCode);
}

export function methodNotAllowed(allow: string[]): JsonResponse {
  return json({ ok: false, code: "method_not_allowed" }, 405, {
    allow: allow.join(", "),
  });
}


