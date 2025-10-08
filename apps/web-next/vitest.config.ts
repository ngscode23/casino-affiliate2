import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname) },
      { find: "@shared", replacement: path.resolve(__dirname, "../..", "packages/shared/src") },
      { find: "@shared/", replacement: path.resolve(__dirname, "../..", "packages/shared/src/") },
      { find: "@ui", replacement: path.resolve(__dirname, "../..", "packages/ui/src") },
      { find: "@ui/", replacement: path.resolve(__dirname, "../..", "packages/ui/src/") },
    ],
  },
  esbuild: {
    jsx: "automatic",
    jsxDev: true,
  },
});
