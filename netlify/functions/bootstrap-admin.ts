// netlify/functions/bootstrap-admin.ts
// One-time bootstrap to create or promote an admin user in Supabase Auth.
// Secure with `x-admin-token: <ADMIN_TOKEN>` from env.
// Usage:
//   POST /.netlify/functions/bootstrap-admin  { email?: string }
//   Headers: x-admin-token, and optionally Authorization: Bearer <user-jwt>
// If `email` provided: creates (or ensures) a user with role=admin (email_confirm=true).
// If no `email`: uses Authorization JWT to promote current user to admin.

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string | undefined;
const BOOTSTRAP_ENABLED = ((process.env.BOOTSTRAP_ENABLED ?? "true").toString().toLowerCase() !== "false");

function json(body: any, statusCode = 200) {
  return { statusCode, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ ok: false, code: "misconfig" }, 500);
    if (!ADMIN_TOKEN) return json({ ok: false, code: "misconfig", message: "ADMIN_TOKEN missing" }, 500);
    if (!BOOTSTRAP_ENABLED) return json({ ok: false, code: "disabled" }, 410);
    const token = (event.headers["x-admin-token"] || event.headers["X-Admin-Token"]) as string | undefined;
    if (!token || token !== ADMIN_TOKEN) return json({ ok: false, code: "unauthorized" }, 401);

    const method = event.httpMethod || "GET";
    if (method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);

    let body: any = {};
    try { body = JSON.parse(event.body || "{}"); } catch {}
    const email = String(body?.email || "").trim().toLowerCase();

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    if (email) {
      // Create or update user with admin role
      // Try createUser first
      let userId: string | null = null;
      const password = typeof body?.password === "string" && body.password.trim().length >= 8 ? body.password.trim() : undefined;
      try {
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "admin" } });
        if (error) {
          // If user exists, we will try to find and update below
        } else {
          userId = (data?.user as any)?.id || null;
          if (userId) {
            // Ensure app_metadata.role is also set to 'admin' for JWT claims used by RLS
            try { await admin.auth.admin.updateUserById(userId, { app_metadata: { role: "admin" } as any }); } catch {}
          }
        }
      } catch {}
      if (!userId) {
        // We need to find the user by email; listUsers returns pages — try first page
        try {
          const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const found = (data?.users || []).find((u: any) => (u?.email || "").toLowerCase() === email);
          if (found?.id) {
            userId = found.id;
            await admin.auth.admin.updateUserById(userId, { user_metadata: { role: "admin" }, app_metadata: { role: "admin" } as any, ...(password ? { password } : {}) } as any);
          }
        } catch {}
      }
      return userId ? json({ ok: true, user_id: userId }) : json({ ok: false, code: "not_found" }, 404);
    }

    // No email: promote current user from Authorization JWT
    const bearer = (event.headers["authorization"] || event.headers["Authorization"]) as string | undefined;
    const m = bearer?.match(/^Bearer\s+(.+)$/i);
    const jwt = m?.[1];
    if (!jwt || !SUPABASE_ANON_KEY) return json({ ok: false, code: "bad_request", message: "email or Authorization required" }, 400);
    const pub = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data, error } = await pub.auth.getUser();
    if (error || !data?.user?.id) return json({ ok: false, code: "unauthorized" }, 401);
    const uid = data.user.id as string;
    const { error: uerr } = await admin.auth.admin.updateUserById(uid, { user_metadata: { role: "admin" }, app_metadata: { role: "admin" } as any });
    if (uerr) return json({ ok: false, code: "db", message: uerr.message }, 500);
    return json({ ok: true, user_id: uid });
  } catch (e: any) {
    return json({ ok: false, code: "internal", message: String(e?.message || e) }, 500);
  }
};

export default handler;
