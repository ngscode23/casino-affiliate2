// vite.config.ts
import path from "node:path";
import { defineConfig } from "vite";

import { visualizer } from "rollup-plugin-visualizer";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import pkg from "./package.json";

import react from "@vitejs/plugin-react";





export default defineConfig(() => {

  const plugins = [
    react(),
    process.env.ANALYZE === "true" &&
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
        open: false,
      }),
  ].filter(Boolean) as any[];

  const wantSentry =
    !!process.env.SENTRY_AUTH_TOKEN &&
    !!process.env.SENTRY_ORG &&
    !!process.env.SENTRY_PROJECT;

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
      alias: { "@": path.resolve(process.cwd(), "src") },
    },
    define: {
      __APP_NAME__: JSON.stringify(pkg.name),
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
      target: "es2020",
      cssMinify: "lightningcss",
      cssCodeSplit: true,
      sourcemap: !!wantSentry,
      // игнорим сорсмапы из node_modules, чтобы не захламляли Sentry/отчёты
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
            if (id.includes("/src/features/offers/")) return "feature-offers";
            return undefined;
          },
        },
      },
        server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'ripe-hands-cut.lzoca.lt' // твой туннельный хост
    ],
    host: true, // чтобы принимать внешние коннекты
    port: 8888, // или тот, который используешь
  },
    },
  };
});