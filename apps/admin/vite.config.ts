import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@admin": path.resolve(__dirname, "src"),
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
      cssMinify: "lightningcss" as const,
      cssCodeSplit: true,
    },
    server: {
      host: true,
      port: Number(process.env.VITE_ADMIN_PORT || 5174),
      strictPort: true,
      allowedHosts: ["localhost", "127.0.0.1"],
      proxy: {
        "/api": {
          target: "http://localhost:8888",
          changeOrigin: true,
        },
        "/.netlify/functions": {
          target: "http://localhost:8888",
          changeOrigin: true,
        },
      },
    },
  };
});

