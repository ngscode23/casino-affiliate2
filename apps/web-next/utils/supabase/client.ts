import { createBrowserClient } from "@supabase/ssr";

function getAnonKey() {
  // Prefer new publishable key format (sb_publishable_*), fallback to anon
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}

export function createClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (getAnonKey() || "").trim();

  if (!supabaseUrl) {
    throw new Error(
      "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL in your environment."
    );
  }

  if (!anonKey) {
    throw new Error(
      "Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  try {
    return createBrowserClient(supabaseUrl, anonKey);
  } catch (error) {
    const message = toErrorMessage(
      error,
      "Unexpected error while creating Supabase browser client"
    );
    throw new Error(`Failed to create Supabase browser client: ${message}`);
  }
}
