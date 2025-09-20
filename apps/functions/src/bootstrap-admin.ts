import type { Handler } from "@netlify/functions";
import { json } from "@shared/netlify/shared/auth/http";
import { requireAuth, toAuthUserRecord } from "@shared/netlify/shared/auth/guard";
import { toPublicUser } from "@shared/netlify/shared/auth/user";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string | undefined;
const BOOTSTRAP_ENABLED = ((process.env.BOOTSTRAP_ENABLED ?? "true").toString().toLowerCase() !== "false");

function headerToken(event: Parameters<Handler>[0]) {
  return (event.headers?.["x-admin-token"] || event.headers?.["X-Admin-Token"]) as string | undefined;
}

export const handler: Handler = async (event) => {
  try {
    if (!ADMIN_TOKEN) return json({ ok: false, code: "misconfig", message: "ADMIN_TOKEN missing" }, 500);
    if (!BOOTSTRAP_ENABLED) return json({ ok: false, code: "disabled" }, 410);

    const token = headerToken(event);
    if (!token || token !== ADMIN_TOKEN) return json({ ok: false, code: "unauthorized" }, 401);

    if ((event.httpMethod || "GET").toUpperCase() !== "POST") {
      return json({ ok: false, code: "method_not_allowed" }, 405, {
        allow: "POST",
      });
    }

    let body: Record<string, unknown> = {};
    try { body = JSON.parse(event.body || "{}"); } catch { /* ignore */ }

    const emailRaw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const supabase = getServiceClient();
    const admin = supabase.auth.admin;

    if (emailRaw) {
      const passwordRaw = typeof body?.password === "string" ? body.password.trim() : "";
      if (passwordRaw && passwordRaw.length < 8) {
        return json({ ok: false, code: "invalid_password", message: "Password must be at least 8 characters" }, 400);
      }

      const defaultPassword = process.env.BOOTSTRAP_DEFAULT_PASSWORD || "ChangeMe123!";
      const password = passwordRaw || defaultPassword;

      let existingUser = null;
      const pageSize = 200;
      let page = 1;
      while (!existingUser) {
        const { data: list, error: listError } = await admin.listUsers({ page, perPage: pageSize });
        if (listError) throw listError;
        const users = list?.users ?? [];
        existingUser = users.find((u) => (u.email || "").toLowerCase() === emailRaw) ?? null;
        if (existingUser || users.length < pageSize) break;
        page += 1;
      }

      if (!existingUser) {
        const { data, error } = await admin.createUser({
          email: emailRaw,
          password,
          email_confirm: true,
          app_metadata: { role: "admin" },
        });
        if (error || !data?.user) throw error ?? new Error("Failed to create user");
        return json({ ok: true, user: toPublicUser(toAuthUserRecord(data.user)) });
      }

      const updatePayload: Parameters<typeof admin.updateUserById>[1] = {
        app_metadata: { ...(existingUser.app_metadata ?? {}), role: "admin" },
      };
      if (passwordRaw) updatePayload.password = password;

      const { data, error } = await admin.updateUserById(existingUser.id, updatePayload);
      if (error) throw error;
      const updatedUser = data?.user ?? existingUser;
      return json({ ok: true, user: toPublicUser(toAuthUserRecord(updatedUser)) });
    }

    // Promote currently authenticated user
    const authResult = await requireAuth(event);
    if ("response" in authResult) return authResult.response;

    const { rawUser } = authResult;
    const { data, error: updateError } = await admin.updateUserById(rawUser.id, {
      app_metadata: { ...(rawUser.app_metadata ?? {}), role: "admin" },
    });
    if (updateError) throw updateError;
    const updated = data?.user ?? rawUser;
    return json({ ok: true, user: toPublicUser(toAuthUserRecord(updated)) });
  } catch (e: any) {
    return json({ ok: false, code: "internal", message: String(e?.message || e) }, 500);
  }
};

export default handler;

