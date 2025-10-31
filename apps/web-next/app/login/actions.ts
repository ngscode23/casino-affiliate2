"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { AUTH_CALLBACK_URL } from "@shared/config";

export type AuthActionState = {
  success: boolean;
  error?: string | null;
};

const DEFAULT_STATE: AuthActionState = { success: false };

function sanitize(input: FormDataEntryValue | null): string {
  return typeof input === "string" ? input.trim() : "";
}

export async function loginAction(
  _prevState: AuthActionState = DEFAULT_STATE,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const email = sanitize(formData.get("email"));
  const password = sanitize(formData.get("password"));

  if (!email || !password) {
    return { success: false, error: "Enter both email and password." };
  }

  const supabase = await createClient();
  const cookieStore = await cookies();
  const anonId = cookieStore.get("anon_id")?.value ?? null;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: error.message || "Unable to sign in." };
  }

  if (anonId) {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id ?? null;
      if (userId) {
        await supabase.rpc("merge_recent_views", { _anon_id: anonId, _user_id: userId });
      }
    } catch {
      // Ignore merge failures to avoid breaking login flow
    }
  }

  // invalidate layout to refresh user-aware content
  revalidatePath("/", "layout");

  return { success: true };
}

export async function signupAction(
  _prevState: AuthActionState = DEFAULT_STATE,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState;
  const email = sanitize(formData.get("email"));
  const password = sanitize(formData.get("password"));

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: AUTH_CALLBACK_URL || undefined,
    },
  });

  if (error) {
    return { success: false, error: error.message || "Unable to register." };
  }

  return { success: true };
}
