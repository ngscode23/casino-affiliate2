// Shared Vitest setup for web-next tests.

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

// Silence “environment is not configured to support act(...)” warnings
// when using react-dom/test-utils in Vitest (jsdom).
// See https://react.dev/reference/react-dom/test-utils/act
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
