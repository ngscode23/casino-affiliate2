import { test, expect, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
test.use({ baseURL: BASE_URL });

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.SUPABASE_PROJECT_URL ?? process.env.SB_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;

const SLOT_ID = "00000000-0000-4000-8000-0000000000a1";
const LIVE_ID = "00000000-0000-4000-8000-0000000000b1";

test.skip(!SUPABASE_URL || !SERVICE_KEY, "Supabase env vars are required for personalization smoke.");

test.beforeAll(async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  const payload = [
    {
      anon_id: SLOT_ID,
      first_seen: now,
      last_seen: now,
      updated_at: now,
      visit_count: 3,
      device_pref: "mobile",
      countries: ["br"],
      categories: ["slots", "jackpot"],
      discount_affinity: 0.72,
      cold_start: false,
      opt_out: false,
      experiment_variant: "personalized",
    },
    {
      anon_id: LIVE_ID,
      first_seen: now,
      last_seen: now,
      updated_at: now,
      visit_count: 3,
      device_pref: "desktop",
      countries: ["de"],
      categories: ["live", "table"],
      discount_affinity: 0.18,
      cold_start: false,
      opt_out: false,
      experiment_variant: "personalized",
    },
  ];

  const { error } = await admin.from("user_profiles").upsert(payload, { onConflict: "anon_id" });
  if (error) {
    throw new Error(`Failed to seed user_profiles: ${error.message}`);
  }
});

async function fetchPersonalized(request: APIRequestContext, anonId: string) {
  const res = await request.get("/api/personalized-products", {
    headers: {
      "x-anon-id": anonId,
      "x-geo-country": anonId === SLOT_ID ? "br" : "de",
      "x-device-class": anonId === SLOT_ID ? "mobile" : "desktop",
      "x-experiment-variant": "personalized",
    },
  });
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.ok).toBeTruthy();
  expect(json.personalized).toBe(true);
  expect(json.profile?.anon_id).toBe(anonId);
  return json;
}

test("personalized-products returns profile and products for slots persona", async ({ request }) => {
  const json = await fetchPersonalized(request, SLOT_ID);
  expect(Array.isArray(json.products)).toBe(true);
  expect(json.profile?.categories?.[0]).toBe("slots");
});

test("personalized-products returns profile and products for live persona", async ({ request }) => {
  const json = await fetchPersonalized(request, LIVE_ID);
  expect(Array.isArray(json.products)).toBe(true);
  expect(json.profile?.categories?.[0]).toBe("live");
});
