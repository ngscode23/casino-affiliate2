/**
 * Synthetic personalization seed for local/staging.
 *
 * Usage:
 *   pnpm --filter web-next exec tsx scripts/seed-personalization.ts --users 200 --windowDays 30
 *
 * Env (read-only):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY | SERVICE_ROLE_KEY
 *
 * The script writes directly to `user_events` and `user_profiles` using the service role.
 * It avoids printing secrets and keeps inserts batched to stay under payload limits.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

type Segment = {
  name: string;
  category: string;
  device: "mobile" | "desktop";
  countries: string[];
  clickRate: number; // probability of a click after an impression
  discountRate: number; // share of clicks counted as discount-driven
  priceBucket: string;
  experimentVariant: "personalized" | "control";
};

type EventRow = {
  anon_id: string;
  event: string;
  product_id: string | null;
  category: string | null;
  price_bucket: string | null;
  device: string | null;
  country: string | null;
  referrer: string | null;
  experiment_variant: string | null;
  ts: string;
};

type ProfileRow = {
  anon_id: string;
  first_seen: string;
  last_seen: string;
  updated_at: string;
  visit_count: number;
  device_pref: string | null;
  countries: string[];
  categories: string[];
  discount_affinity: number;
  cold_start: boolean;
  opt_out: boolean;
  experiment_variant: string | null;
};

type PersonalizationDb = {
  public: {
    Tables: {
      user_events: {
        Row: EventRow;
        Insert: EventRow;
        Update: Partial<EventRow>;
        Relationships: [];
      };
      user_profiles: {
        Row: ProfileRow;
        Insert: ProfileRow;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.SUPABASE_PROJECT_URL ?? process.env.SB_URL ?? "";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "[seed-personalization] Missing SUPABASE_URL or SERVICE_ROLE_KEY. Set env and rerun."
  );
  process.exit(1);
}

const args = new Map<string, string>();
for (const arg of process.argv.slice(2)) {
  const [key, value = "true"] = arg.split("=");
  args.set(key.replace(/^--/, ""), value);
}

const TOTAL_USERS = clampInt(args.get("users"), 200, 10_000);
const WINDOW_DAYS = clampInt(args.get("windowDays") ?? args.get("days"), 30, 90);
const MIN_EVENTS = clampInt(args.get("minEvents"), 4, 200);
const MAX_EVENTS = clampInt(args.get("maxEvents"), 12, 500);
const seedArg = args.get("seed");
const rng = createRng(seedArg ? Number(seedArg) : Date.now());

const segments: Segment[] = [
  {
    name: "mobile_slots_discount",
    category: "slots",
    device: "mobile",
    countries: ["br", "mx", "ar", "cl"],
    clickRate: 0.55,
    discountRate: 0.7,
    priceBucket: "discounted",
    experimentVariant: "personalized",
  },
  {
    name: "desktop_live_high",
    category: "live",
    device: "desktop",
    countries: ["de", "se", "no", "fi"],
    clickRate: 0.45,
    discountRate: 0.15,
    priceBucket: "high",
    experimentVariant: "personalized",
  },
  {
    name: "casual_us",
    category: "casual",
    device: "desktop",
    countries: ["us", "ca", "gb"],
    clickRate: 0.32,
    discountRate: 0.25,
    priceBucket: "mid",
    experimentVariant: "control",
  },
  {
    name: "jackpot_bonus",
    category: "jackpot",
    device: "mobile",
    countries: ["in", "ph", "th", "vn"],
    clickRate: 0.6,
    discountRate: 0.82,
    priceBucket: "promo",
    experimentVariant: "personalized",
  },
];

async function main() {
  const client = createClient<PersonalizationDb>(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const events: EventRow[] = [];
  const profiles = new Map<string, ProfileRow>();

  for (let i = 0; i < TOTAL_USERS; i += 1) {
    const segment = segments[i % segments.length];
    const anonId = makeDeterministicUuid(segment.name, i, rng());
    const eventCount = clampInt(randomInRange(MIN_EVENTS, MAX_EVENTS, rng), MIN_EVENTS, MAX_EVENTS);
    const country = pick(segment.countries, rng);
    const createdAt = Date.now();

    let clicks = 0;
    let discountClicks = 0;
    const daySet = new Set<string>();

    for (let j = 0; j < eventCount; j += 1) {
      const daysAgo = Math.floor(rng() * WINDOW_DAYS);
      const ts = new Date(createdAt - daysAgo * 86_400_000 - rng() * 86_400_000).toISOString();
      daySet.add(ts.slice(0, 10));

      const impression: EventRow = {
        anon_id: anonId,
        event: "product_impression",
        product_id: null,
        category: segment.category,
        price_bucket: segment.priceBucket,
        device: segment.device,
        country,
        referrer: "seed-script",
        experiment_variant: segment.experimentVariant,
        ts,
      };
      events.push(impression);

      if (rng() < segment.clickRate) {
        const isDiscount = rng() < segment.discountRate;
        const click: EventRow = {
          ...impression,
          event: isDiscount ? "product_click_discount" : "product_click",
          price_bucket: isDiscount ? "discounted" : impression.price_bucket,
        };
        events.push(click);
        clicks += 1;
        if (isDiscount) discountClicks += 1;
      }
    }

    const lastSeen = new Date().toISOString();
    const discountAffinity = clicks > 0 ? Math.min(1, discountClicks / clicks) : 0;
    profiles.set(anonId, {
      anon_id: anonId,
      first_seen: lastSeen,
      last_seen: lastSeen,
      updated_at: lastSeen,
      visit_count: Math.max(1, daySet.size),
      device_pref: segment.device,
      countries: [country],
      categories: [segment.category],
      discount_affinity: Number(discountAffinity.toFixed(3)),
      cold_start: false,
      opt_out: false,
      experiment_variant: segment.experimentVariant,
    });
  }

  console.info(
    `[seed-personalization] Generated ${events.length} events for ${profiles.size} users across ${segments.length} segments.`,
  );

  await insertBatched(client, "user_events", events, 1000);
  await insertBatched(client, "user_profiles", Array.from(profiles.values()), 500);

  console.info("[seed-personalization] Done.");
}

type TableName = keyof PersonalizationDb["public"]["Tables"];

async function insertBatched(
  client: SupabaseClient<PersonalizationDb>,
  table: TableName,
  rows: EventRow[] | ProfileRow[],
  chunkSize: number,
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await client.from(table).upsert(chunk as any, {
      onConflict: table === "user_profiles" ? "anon_id" : undefined,
    });
    if (error) {
      throw new Error(`[seed-personalization] Failed inserting into ${table}: ${error.message}`);
    }
  }
}

function clampInt(value: string | number | undefined, fallback: number, max: number): number {
  const num = typeof value === "string" ? Number(value) : typeof value === "number" ? value : fallback;
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.min(Math.trunc(num), max));
}

function randomInRange(min: number, max: number, rand: () => number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function createRng(seed: number) {
  // xorshift32
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return ((state < 0 ? ~state + 1 : state) % 1_000_000) / 1_000_000;
  };
}

function makeDeterministicUuid(segment: string, index: number, salt: number): string {
  const hash = createHash("sha256").update(`${segment}:${index}:${salt}`).digest("hex");
  // Format into UUID v4 style (pseudo).
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    "8" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

main().catch((error) => {
  console.error("[seed-personalization] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
