import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import pkg from "./package.json" with { type: "json" };

export default defineConfig(() => {
  const plugins = [react()];

  if (process.env.ANALYZE === "true") {
    plugins.push(
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
        open: false,
      }) as any
    );
  }

  const wantSentry =
    Boolean(process.env.SENTRY_AUTH_TOKEN) &&
    Boolean(process.env.SENTRY_ORG) &&
    Boolean(process.env.SENTRY_PROJECT);

  if (wantSentry) {
    plugins.push(
      sentryVitePlugin({
        org: process.env.SENTRY_ORG!,
        project: process.env.SENTRY_PROJECT!,
        authToken: process.env.SENTRY_AUTH_TOKEN!,
        release: { name: process.env.SENTRY_RELEASE || undefined },
        sourcemaps: { assets: "./dist/**" },
        bundleSizeOptimizations: { excludeDebugStatements: true },
      }) as any
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@web": path.resolve(__dirname, "src"),
        "@shared": path.resolve(__dirname, "../../packages/shared/src"),
        "@ui": path.resolve(__dirname, "../../packages/ui/src"),
        "@types": path.resolve(__dirname, "../../packages/types/src"),
      },
    },
    define: {
      __APP_NAME__: JSON.stringify(pkg.name),
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
      target: "es2020",
      cssMinify: "lightningcss",
      cssCodeSplit: true,
      sourcemap: wantSentry,
      sourcemapIgnoreList: (relativePath: string) =>
        relativePath.includes("node_modules"),
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              if (id.includes("react-dom") || id.includes("react")) return "vendor-react";
              if (id.includes("react-router")) return "vendor-react-router";
              if (id.includes("@supabase")) return "vendor-supabase";
              if (id.includes("@sentry")) return "vendor-sentry";
              if (id.includes("posthog-js")) return "vendor-posthog";
            }
            if (id.includes("/features/offers/")) return "feature-offers";
            return undefined;
          },
        },
      },
    },
    server: {
      host: true,
      port: Number(process.env.VITE_DEV_PORT || 5173),
      allowedHosts: ["localhost", "127.0.0.1"],
    },
  };
});
