// vite.config.ts
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json";
import { visualizer } from "rollup-plugin-visualizer";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// ????-???????????? export
export default defineConfig((_env) => {
  const plugins: any[] = [react()];

  // Visualizer (set ANALYZE=true)
  if (process.env.ANALYZE === "true") {
    plugins.push(
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }) as any
    );
  }

  // Sentry sourcemaps (optional)
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
      alias: { "@": path.resolve(__dirname, "src") },
    },
    define: {
      __APP_NAME__: JSON.stringify(pkg.name),
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
      sourcemap: !!wantSentry,
      // Use Lightning CSS for CSS minification to avoid esbuild CSS quirks
      cssMinify: 'lightningcss',
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
