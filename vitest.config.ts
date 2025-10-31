import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web-next"),
      "@shared": path.resolve(__dirname, "packages/shared/src"),
      "@ui": path.resolve(__dirname, "packages/ui/src"),
    },
  },
  test: {
    name: "node",
    globals: true,
    environment: "node",
    include: [
      "tests/**/*.{test,spec}.?(c|m)[jt]s?(x)",
      "apps/web-next/tests/**/*.{test,spec}.?(c|m)[jt]s?(x)",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    },
    setupFiles: ["apps/web-next/vitest.setup.ts"],
  },
});