import { defineConfig } from "vitest/config";
import path from "node:path";

const baseResolve = {
  alias: {
    "@": path.resolve(__dirname, "apps/web-next"),
    "@shared": path.resolve(__dirname, "packages/shared/src"),
    "@ui": path.resolve(__dirname, "packages/ui/src"),
  },
};

const setupFile = path.resolve(__dirname, "apps/web-next/vitest.setup.ts");
const sharedTestEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
};
const sharedExclude = ["**/node_modules/**", "**/dist/**", "e2e/**"];

export default defineConfig({
  resolve: baseResolve,
  test: {
    globals: true,
    // Skip Playwright e2e specs in the default run.
    exclude: sharedExclude,
    include: [
      "tests/**/*.{test,spec}.?(c|m)[jt]s?(x)",
      "apps/web-next/tests/**/*.{test,spec}.?(c|m)[jt]s?(x)",
    ],
    env: sharedTestEnv,
    setupFiles: [setupFile],
    environment: "node",
    environmentMatchGlobs: [
      ["apps/web-next/tests/**/*.{test,spec}.?(c|m)[jt]s?(x)", "jsdom"],
    ],
  },
});
