import type { PostgrestError } from "@supabase/supabase-js";
import type { PostgrestFilterBuilder, PostgrestBuilder } from "@supabase/postgrest-js";

type SupabasePromise<T> =
  | PromiseLike<{ data: T | null; error: PostgrestError | null }>
  | PostgrestFilterBuilder<any, any, any, any, any, any, any>
  | PostgrestBuilder<any, any, any>;

export async function safeQuery<T>(
  promise: SupabasePromise<T>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await promise;
    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[safeQuery] supabase error", error);
      }
      return { data, error: error.message ?? "Unknown error" };
    }
    return { data, error: null };
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[safeQuery] unexpected exception", err);
    }
    return { data: null, error: err?.message ?? "Unknown error" };
  }
}
