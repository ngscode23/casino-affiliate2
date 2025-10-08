type EnvRecord = Record<string, string | undefined>;

let cachedEnv: EnvRecord | null = null;

function collectLiteralEnv(): EnvRecord {
  const env: EnvRecord = {};

  const put = (key: string, value: string | undefined) => {
    if (typeof value === "string") env[key] = value;
  };

  // Important: use direct process.env.X so Next can inline at build-time
  put("NEXT_PUBLIC_SITE_ORIGIN", process.env.NEXT_PUBLIC_SITE_ORIGIN as any);
  put("SITE_ORIGIN", process.env.SITE_ORIGIN as any);
  put("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL as any);
  put("SITE_URL", process.env.SITE_URL as any);
  put("NEXT_PUBLIC_SITE_NAME", process.env.NEXT_PUBLIC_SITE_NAME as any);
  put("SITE_NAME", process.env.SITE_NAME as any);
  put("NEXT_PUBLIC_BRAND_NAME", process.env.NEXT_PUBLIC_BRAND_NAME as any);
  put("BRAND_NAME", process.env.BRAND_NAME as any);
  put("NEXT_PUBLIC_BRAND_LOGO", process.env.NEXT_PUBLIC_BRAND_LOGO as any);
  put("BRAND_LOGO", process.env.BRAND_LOGO as any);
  put("NEXT_PUBLIC_GA_ID", process.env.NEXT_PUBLIC_GA_ID as any);
  put("NEXT_PUBLIC_GA_MEASUREMENT_ID", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID as any);
  put("GA_ID", process.env.GA_ID as any);
  put("GA_MEASUREMENT_ID", process.env.GA_MEASUREMENT_ID as any);
  put("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL as any);
  put("SUPABASE_URL", process.env.SUPABASE_URL as any);
  put("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as any);
  put("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as any);
  put("SUPABASE_PUBLISHABLE_KEY", process.env.SUPABASE_PUBLISHABLE_KEY as any);
  put("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY as any);
  put("NEXT_PUBLIC_SUPABASE_PRODUCT_BUCKET", process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_BUCKET as any);
  put("SUPABASE_PRODUCT_BUCKET", process.env.SUPABASE_PRODUCT_BUCKET as any);
  put("NEXT_PUBLIC_FUNCTIONS_URL", process.env.NEXT_PUBLIC_FUNCTIONS_URL as any);
  put("NEXT_PUBLIC_FN_BASE", process.env.NEXT_PUBLIC_FN_BASE as any);
  put("FUNCTIONS_URL", process.env.FUNCTIONS_URL as any);
  put("FN_BASE", process.env.FN_BASE as any);
  put("NEXT_PUBLIC_ADMIN_TOKEN", process.env.NEXT_PUBLIC_ADMIN_TOKEN as any);
  put("ADMIN_TOKEN", process.env.ADMIN_TOKEN as any);
  put("NEXT_PUBLIC_FEATURE_POSTHOG", process.env.NEXT_PUBLIC_FEATURE_POSTHOG as any);
  put("FEATURE_POSTHOG", process.env.FEATURE_POSTHOG as any);
  put("NEXT_PUBLIC_POSTHOG_KEY", process.env.NEXT_PUBLIC_POSTHOG_KEY as any);
  put("POSTHOG_KEY", process.env.POSTHOG_KEY as any);
  put("NEXT_PUBLIC_POSTHOG_HOST", process.env.NEXT_PUBLIC_POSTHOG_HOST as any);
  put("POSTHOG_HOST", process.env.POSTHOG_HOST as any);
  put("NEXT_PUBLIC_WISHLIST_SERVER_SYNC", process.env.NEXT_PUBLIC_WISHLIST_SERVER_SYNC as any);
  put("WISHLIST_SERVER_SYNC", process.env.WISHLIST_SERVER_SYNC as any);
  put("NEXT_PUBLIC_APP_ENV", process.env.NEXT_PUBLIC_APP_ENV as any);
  put("APP_ENV", process.env.APP_ENV as any);
  put("NEXT_PUBLIC_MODE", process.env.NEXT_PUBLIC_MODE as any);
  put("MODE", process.env.MODE as any);
  put("NODE_ENV", process.env.NODE_ENV as any);
  put("NEXT_PUBLIC_SENTRY_DSN", process.env.NEXT_PUBLIC_SENTRY_DSN as any);
  put("SENTRY_DSN", process.env.SENTRY_DSN as any);
  put("NEXT_PUBLIC_SENTRY_RELEASE", process.env.NEXT_PUBLIC_SENTRY_RELEASE as any);
  put("SENTRY_RELEASE", process.env.SENTRY_RELEASE as any);

  return env;
}

const literalEnv: EnvRecord = collectLiteralEnv();

function collectGlobalEnv(): EnvRecord {
  if (typeof globalThis === "undefined") return {};
  const target: EnvRecord = {};
  const candidates: unknown[] = [];
  const g = globalThis as Record<string, unknown>;

  if (typeof g.__ENV__ === "object" && g.__ENV__ !== null) candidates.push(g.__ENV__);
  if (typeof g.__APP_ENV__ === "object" && g.__APP_ENV__ !== null) candidates.push(g.__APP_ENV__);

  const nextData = (g.__NEXT_DATA__ as any) ?? null;
  if (nextData?.env && typeof nextData.env === "object") candidates.push(nextData.env);
  if (nextData?.runtimeConfig?.publicRuntimeConfig && typeof nextData.runtimeConfig.publicRuntimeConfig === "object") {
    candidates.push(nextData.runtimeConfig.publicRuntimeConfig);
  }

  for (const source of candidates) {
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        target[key] = String(value);
      }
    }
  }

  return target;
}

function collectEnv(): EnvRecord {
  const env: EnvRecord = { ...literalEnv };
  if (typeof process !== "undefined" && process.env) {
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === "string") {
        env[key] = value;
      }
    }
  }

  Object.assign(env, collectGlobalEnv());
  return env;
}

export function runtimeEnv(): EnvRecord {
  if (cachedEnv) return cachedEnv;
  cachedEnv = collectEnv();
  return cachedEnv;
}

export function envString(keys: string | string[], fallback = "", { trim = true }: { trim?: boolean } = {}): string {
  const list = Array.isArray(keys) ? keys : [keys];
  const env = runtimeEnv();
  for (const key of list) {
    const value = env[key];
    if (typeof value === "string") {
      return trim ? value.trim() : value;
    }
  }
  return fallback;
}

export function envFlag(keys: string | string[], fallback = false): boolean {
  const raw = envString(keys, "", { trim: true });
  if (!raw) return fallback;
  if (/^(true|1|yes|on)$/i.test(raw)) return true;
  if (/^(false|0|no|off)$/i.test(raw)) return false;
  return fallback;
}

export function envNumber(keys: string | string[], fallback: number): number {
  const raw = envString(keys, "");
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isDevEnvironment(): boolean {
  const env = runtimeEnv();
  const mode = env.NODE_ENV || env.MODE || env.NEXT_PUBLIC_MODE || "";
  return String(mode).toLowerCase() === "development";
}

export function clearCachedRuntimeEnv(): void {
  cachedEnv = null;
}

