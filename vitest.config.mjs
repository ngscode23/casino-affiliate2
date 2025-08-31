// vitest.config.mjs
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") }
  },
  test: {
    environment: "jsdom",
    globals: true,
    reporters: ["verbose"],
    include: [
      "src/__tests__/**/*.{test,spec}.[jt]s?(x)",
      "src/**/__tests__/**/*.{test,spec}.[jt]s?(x)"
    ],
    exclude: [
      "tests/**",
      "e2e/**",
      "_archive/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      "coverage/**",
      ".netlify/**"
    ]
  }
});
