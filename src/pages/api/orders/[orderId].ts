import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { performance } from "perf_hooks";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { InMemoryCacheAdapter } from "../../../sdk/cacheAdapters";
import {
  AuthError,
  NotFoundError,
  OrdersClient,
  UpstreamError,
} from "../../../sdk/ordersClient";
import type { OrderDetailsResponse } from "../../../types/orders";
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
    cachedClient = new OrdersClient({ supabase, cache: sharedCache, metrics: metrics ? { log: metrics.log } : undefined });
    return cachedClient;
  }
  if (metrics) {
    cachedClient = new OrdersClient({ supabase, cache: sharedCache, metrics: { log: metrics.log } });
  }
  return cachedClient;
}

function parseString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function resolveUser(req: NextApiRequest): { userId: string | null; role: string[] } {
  const rawId = req.headers["x-user-id"] ?? null;
  const userId = Array.isArray(rawId) ? rawId[0] : (rawId as string | undefined) ?? null;
  const rawRole = req.headers["x-user-role"] ?? req.headers["x-role"] ?? "";
  const roles = String(rawRole)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  return { userId, role: roles };
}

function handleError(res: NextApiResponse, error: unknown, traceId: string) {
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
  const started = performance.now();

  try {
    const { userId: actorId, role } = resolveUser(req);
    const isSupport = role.includes("support");
    const orderId = parseString(req.query.orderId);
    if (!orderId) throw new NotFoundError("Order id is required");

    const explicitUserId = parseString(req.query.userId);
    const targetUserId = explicitUserId ?? actorId;
    if (!targetUserId) throw new AuthError();

    let cacheHit = false;
    const client = getClient({
      log: (event, meta) => {
        if (event === "orders.details.cache_hit") {
          cacheHit = Boolean(meta?.hit);
        }
      },
    });

    const details = await client.getOrderDetails(orderId, targetUserId ?? "");
    const cacheInfo = client.getCacheMetadata();
    const tookMs = Math.round(performance.now() - started);

    const response: OrderDetailsResponse = {
      order: details,
      meta: {
        tookMs,
        cache: {
          hit: cacheHit,
          adapter: cacheInfo.adapter,
          ttlMs: cacheInfo.ttlMs,
        },
      },
    };

    console.info("[api/orders/:id]", {
      traceId,
      userId: targetUserId,
      orderId,
      tookMs,
      cacheHit,
      cacheAdapter: cacheInfo.adapter,
      cacheTtlMs: cacheInfo.ttlMs,
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("[api/orders/:id] error", { traceId, error });
    handleError(res, error, traceId);
  }
}

