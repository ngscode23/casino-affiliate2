import { vi } from "vitest";
import * as React from "react";

// Shared Vitest setup for web-next tests.

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
// Server-side SDK and API routes may read these envs; set safe test defaults
process.env.SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";

// Optional dependencies (like @sentry/node) may not be installed in CI/test envs.
vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  getCurrentHub: vi.fn(() => ({ getClient: () => null })),
  addBreadcrumb: vi.fn(),
}));

// Some legacy tests still rely on the classic React JSX runtime.
(globalThis as Record<string, unknown>).React = React;

// Silence "environment is not configured to support act(...)" warnings
// when using react-dom/test-utils in Vitest (jsdom).
// See https://react.dev/reference/react-dom/test-utils/act
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
