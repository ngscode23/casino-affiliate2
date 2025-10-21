import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { performance } from "perf_hooks";

import { createClient } from "@supabase/supabase-js";

import { InMemoryCacheAdapter } from "../../sdk/cacheAdapters";
import {
  AuthError,
  NotFoundError,
  OrdersClient,
  UpstreamError,
  type ListOrdersParams,
} from "../../sdk/ordersClient";
import type { OrdersListResponse } from "../../types/orders";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@shared/lib/database.types";

const sharedCache = new InMemoryCacheAdapter();
let supabaseSingleton: SupabaseClient<Database> | null = null;
let cachedClient: OrdersClient | null = null;

function ensureSupabaseClient(): SupabaseClient<Database> | null {
  if (supabaseSingleton) return supabaseSingleton;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabaseSingleton = createClient<Database>(url, key, { auth: { persistSession: false } });
  return supabaseSingleton;
}

function getClient(metrics?: { log: (event: string, meta?: Record<string, unknown>) => void }): OrdersClient {
  const supabase = ensureSupabaseClient() ?? undefined;
  if (!cachedClient) {
    cachedClient = new OrdersClient({ cache: sharedCache, metrics: metrics ? { log: metrics.log } : undefined, supabase });
    return cachedClient;
  }
  if (metrics) {
    cachedClient = new OrdersClient({ cache: sharedCache, metrics: { log: metrics.log }, supabase });
  }
  return cachedClient;
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 20;
  return Math.min(100, Math.max(1, Math.trunc(limit)));
}

function parseString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function resolveUser(req: NextApiRequest): { userId: string | null; role: string[] } {
  const rawId = (req.headers["x-user-id"] ?? req.query.userId ?? null) as string | string[] | null;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;
  const rawRole = req.headers["x-user-role"] ?? req.headers["x-role"] ?? "";
  const roles = String(rawRole)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  return { userId, role: roles };
}

function handleError(res: NextApiResponse, error: unknown, traceId: string) {
  const base = { traceId };
  if (error instanceof AuthError) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: error.message, traceId } });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: error.message, traceId } });
    return;
  }
  if (error instanceof UpstreamError) {
    res.status(502).json({ error: { code: "UPSTREAM", message: error.message, traceId } });
    return;
  }
  res.status(500).json({ error: { code: "UNKNOWN", message: error instanceof Error ? error.message : "Unknown error", traceId } });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const traceId = randomUUID();
  const start = performance.now();

  try {
    const { userId: actorId, role } = resolveUser(req);
    const isSupport = role.includes("support");
    const queryUserId = parseString(req.query.userId);
    const targetUserId = isSupport && queryUserId ? queryUserId : actorId;
    if (!targetUserId) throw new AuthError();

    const params: ListOrdersParams = {
      userId: targetUserId,
      from: parseString(req.query.from),
      to: parseString(req.query.to),
      status: parseString(req.query.status),
      q: parseString(req.query.q),
      sort: (parseString(req.query.sort) as ListOrdersParams["sort"]) ?? "created_at",
      dir: (parseString(req.query.dir) as ListOrdersParams["dir"]) ?? "desc",
      cursor: parseString(req.query.cursor),
      limit: clampLimit(Number(parseString(req.query.limit))),
    };

    let cacheHit = false;
    const client = getClient({
      log: (event, meta) => {
        if (event === "orders.list.cache_hit") {
          cacheHit = Boolean(meta?.hit);
        }
      },
    });

    const { items, nextCursor, total, hasMore } = await client.listOrdersByDate(params);
    const cacheInfo = client.getCacheMetadata();
    const tookMs = Math.round(performance.now() - start);

    const response: OrdersListResponse = {
      items,
      nextCursor,
      total,
      meta: {
        limit: params.limit ?? 20,
        sort: params.sort ?? "created_at",
        dir: params.dir ?? "desc",
        cursor: params.cursor,
        hasMore,
        tookMs,
        cache: {
          hit: cacheHit,
          adapter: cacheInfo.adapter,
          ttlMs: cacheInfo.ttlMs,
        },
      },
    };

    console.info("[api/orders]", {
      traceId,
      userId: targetUserId,
      tookMs,
      items: items.length,
      cacheHit,
      cacheAdapter: cacheInfo.adapter,
      cacheTtlMs: cacheInfo.ttlMs,
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("[api/orders] error", { traceId, error });
    handleError(res, error, traceId);
  }
}

