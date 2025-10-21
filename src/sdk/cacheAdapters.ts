import { setTimeout as sleep } from "timers/promises";
import { createRequire } from "module";

/**
 * Унифицированный интерфейс для кэш-адаптеров. Все реализации должны быть
 * совместимы между собой, чтобы можно было прозрачно переключиться между
 * in-memory и, например, Redis.
 */
export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: { ttlMs?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  flush(pattern?: string): Promise<void>;
}

export type CacheMetricsHook = (event: {
  op: "get" | "set" | "delete" | "flush";
  key?: string;
  hit?: boolean;
}) => void;

/**
 * Простая in-memory реализация, используемая по умолчанию. TTL хранится в
 * миллисекундах.  Подходит для edge/SSR окружений, где нет Redis.
 */
export class InMemoryCacheAdapter implements CacheAdapter {
  private store = new Map<string, { value: unknown; expiresAt: number | null }>();
  constructor(private readonly onMetric?: CacheMetricsHook) {}

  async get<T>(key: string): Promise<T | null> {
    const record = this.store.get(key);
    let hit = false;
    if (record) {
      if (record.expiresAt && record.expiresAt < Date.now()) {
        this.store.delete(key);
      } else {
        hit = true;
        this.onMetric?.({ op: "get", key, hit: true });
        return record.value as T;
      }
    }
    this.onMetric?.({ op: "get", key, hit });
    return null;
  }

  async set<T>(key: string, value: T, options?: { ttlMs?: number }): Promise<void> {
    const ttlMs = options?.ttlMs;
    const expiresAt = typeof ttlMs === "number" && ttlMs > 0 ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });
    this.onMetric?.({ op: "set", key });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.onMetric?.({ op: "delete", key });
  }

  async flush(pattern?: string): Promise<void> {
    if (!pattern) {
      this.store.clear();
      this.onMetric?.({ op: "flush" });
      return;
    }
    const matcher = new RegExp(pattern);
    for (const key of Array.from(this.store.keys())) {
      if (matcher.test(key)) {
        this.store.delete(key);
      }
    }
    this.onMetric?.({ op: "flush" });
  }
}

export type RedisLikeClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { PX?: number }): Promise<void>;
  del(key: string): Promise<void> | Promise<number>;
  scanIterator?(options: { MATCH?: string; COUNT?: number }): AsyncIterable<string>;
  keys?(pattern: string): Promise<string[]>;
};

/**
 * Redis-совместимый адаптер. Клиент передаётся снаружи — это позволяет
 * использовать любую библиотеку (ioredis, @redis/client, upstash и т.п.).
 * При отсутствии Redis можно заменить на NoopCacheAdapter.
 */
export class RedisCacheAdapter implements CacheAdapter {
  constructor(private readonly client: RedisLikeClient, private readonly onMetric?: CacheMetricsHook) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    const hit = raw !== null;
    this.onMetric?.({ op: "get", key, hit });
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T, options?: { ttlMs?: number }): Promise<void> {
    const payload = JSON.stringify(value);
    if (options?.ttlMs) {
      await this.client.set(key, payload, { PX: options.ttlMs });
    } else {
      await this.client.set(key, payload);
    }
    this.onMetric?.({ op: "set", key });
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
    this.onMetric?.({ op: "delete", key });
  }

  async flush(pattern?: string): Promise<void> {
    if (!pattern) {
      if (this.client.keys) {
        const keys = await this.client.keys("*");
        if (keys.length) {
          for (const key of keys) {
            await this.client.del(key);
          }
        }
      } else if (this.client.scanIterator) {
        for await (const key of this.client.scanIterator({ MATCH: "*", COUNT: 1000 })) {
          await this.client.del(key);
        }
      }
      this.onMetric?.({ op: "flush" });
      return;
    }

    if (this.client.scanIterator) {
      for await (const key of this.client.scanIterator({ MATCH: pattern, COUNT: 500 })) {
        await this.client.del(key);
      }
    } else if (this.client.keys) {
      const keys = await this.client.keys(pattern);
      if (keys.length) {
        for (const key of keys) {
          await this.client.del(key);
        }
      }
    }
    this.onMetric?.({ op: "flush" });
  }
}

/**
 * No-op реализация. Полезна в тестах или когда кэширование нужно отключить,
 * но код должен работать с тем же интерфейсом.
 */
export class NoopCacheAdapter implements CacheAdapter {
  constructor(private readonly latencyMs = 0) {}

  async get<T>(_key: string): Promise<T | null> {
    if (this.latencyMs) await sleep(this.latencyMs);
    return null;
  }
  async set<T>(_key: string, _value: T): Promise<void> {
    if (this.latencyMs) await sleep(this.latencyMs);
  }
  async delete(_key: string): Promise<void> {
    if (this.latencyMs) await sleep(this.latencyMs);
  }
  async flush(): Promise<void> {
    if (this.latencyMs) await sleep(this.latencyMs);
  }
}

const requireFromModule = createRequire(import.meta.url);

let cachedRedisClient: RedisLikeClient | null = null;

function ensureRedisClient(url: string): RedisLikeClient | null {
  if (!url) return null;
  if (cachedRedisClient) return cachedRedisClient;
  try {
    const redisModule = requireFromModule("@redis/client") as {
      createClient: (options: { url: string }) => {
        connect: () => Promise<void>;
        isOpen: boolean;
        on?: (event: string, listener: (...args: unknown[]) => void) => void;
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string, options?: { PX?: number }) => Promise<void>;
        del: (...keys: string[]) => Promise<number>;
        scanIterator?: (options?: { MATCH?: string; COUNT?: number }) => AsyncIterable<string>;
        keys?: (pattern: string) => Promise<string[]>;
      };
    };
    const rawClient = redisModule.createClient({ url });
    let connectPromise: Promise<void> | null = null;
    const ensureConnected = async () => {
      if (rawClient.isOpen) return;
      if (!connectPromise) {
        connectPromise = rawClient.connect().catch((error) => {
          connectPromise = null;
          throw error;
        });
      }
      await connectPromise;
    };
    rawClient.on?.("error", (error: unknown) => {
      console.error("[orders-cache] redis error", error);
    });
    const wrapper: RedisLikeClient = {
      async get(key) {
        await ensureConnected();
        return rawClient.get(key);
      },
      async set(key, value, options) {
        await ensureConnected();
        if (options?.PX) {
          await rawClient.set(key, value, { PX: options.PX });
        } else {
          await rawClient.set(key, value);
        }
      },
      async del(key) {
        await ensureConnected();
        return rawClient.del(key);
      },
      scanIterator(options) {
        const iterate = async function* () {
          await ensureConnected();
          if (typeof rawClient.scanIterator === "function") {
            for await (const key of rawClient.scanIterator(options)) {
              yield key;
            }
          }
        };
        return iterate();
      },
      async keys(pattern) {
        await ensureConnected();
        if (typeof rawClient.keys === "function") {
          return rawClient.keys(pattern);
        }
        return [];
      },
    };
    cachedRedisClient = wrapper;
    return cachedRedisClient;
  } catch (error) {
    console.warn(
      "[orders-cache] unable to initialise redis client",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export type CacheAdapterResolution =
  | { adapter: CacheAdapter; name: "memory" }
  | { adapter: CacheAdapter; name: "redis" };

export function resolveCacheAdapterFromEnv(onMetric?: CacheMetricsHook): CacheAdapterResolution {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    const client = ensureRedisClient(redisUrl);
    if (client) {
      return { adapter: new RedisCacheAdapter(client, onMetric), name: "redis" };
    }
  }
  return { adapter: new InMemoryCacheAdapter(onMetric), name: "memory" };
}

export const DEFAULT_CACHE_TTL_MS = 30_000;

