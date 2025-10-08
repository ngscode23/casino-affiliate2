"use server";

import { createClient } from "@/utils/supabase/server";
import { AUTH_CALLBACK_URL } from "@shared/config";

export type ResetState = {
  success: boolean;
  error?: string | null;
};

const DEFAULT_STATE: ResetState = { success: false };

function sanitize(input: FormDataEntryValue | null): string {
  return typeof input === "string" ? input.trim() : "";
}

export async function requestPasswordReset(
  _prevState: ResetState = DEFAULT_STATE,
  formData: FormData,
): Promise<ResetState> {
  void _prevState;
  const email = sanitize(formData.get("email"));

  if (!email) {
    return { success: false, error: "Enter the email linked to your account." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: AUTH_CALLBACK_URL || undefined,
  });

  if (error) {
    return { success: false, error: error.message || "Unable to send reset email." };
  }

  return { success: true };
}
