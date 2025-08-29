// vite.config.ts
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json";

// ????-???????????? export
export default defineConfig(async () => {
  const plugins: any[] = [react()];

  // Visualizer (??????? ????? ANALYZE=true)
  if (process.env.ANALYZE === "true") {
    try {
      const { visualizer } = await import("rollup-plugin-visualizer");
      plugins.push(
        visualizer({
          filename: "dist/stats.html",
          gzipSize: true,
          brotliSize: true,
          template: "treemap",
        }) as any
      );
    } catch {
      console.warn("[vite] rollup-plugin-visualizer ?? ??????????. npm i -D rollup-plugin-visualizer");
    }
  }

  // Sentry sourcemaps (?????? ???? ???? ?????????? ?????????)
  const wantSentry =
    !!process.env.SENTRY_AUTH_TOKEN &&
    !!process.env.SENTRY_ORG &&
    !!process.env.SENTRY_PROJECT;

  if (wantSentry) {
    try {
      const { sentryVitePlugin } = await import("@sentry/vite-plugin");
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
    } catch {
      console.warn("[vite] @sentry/vite-plugin ?? ??????????. npm i -D @sentry/vite-plugin");
    }
  }

  return {
    plugins,
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    define: {
      __APP_NAME__: JSON.stringify(pkg.name),
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
      sourcemap: !!wantSentry,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              if (id.includes("react-router")) return "vendor-react-router";
              if (id.includes("react-dom") || id.includes("react")) return "vendor-react";
              if (id.includes("@supabase")) return "vendor-supabase";
              if (id.includes("posthog-js")) return "vendor-posthog";
              if (id.includes("@sentry")) return "vendor-sentry";
            }
            if (id.includes("/src/features/offers/")) return "feature-offers";
            return undefined;
          },
        },
      },
      // chunkSizeWarningLimit: 1200,
    },
  };
});

