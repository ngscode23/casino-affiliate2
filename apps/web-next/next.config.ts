import { createRequire } from "module";
import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

process.env.TAILWIND_DISABLE_LIGHTNINGCSS =
  process.env.TAILWIND_DISABLE_LIGHTNINGCSS ?? process.env.DISABLE_LIGHTNINGCSS ?? "0";
process.env.LIGHTNINGCSS_FORCE_WASM = process.env.LIGHTNINGCSS_FORCE_WASM ?? "1";

const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storageHostname = (() => {
  if (!storageUrl) return undefined;
  try {
    return new URL(storageUrl).hostname;
  } catch {
    return undefined;
  }
})();

const remotePatterns: RemotePattern[] = [];

if (storageHostname) {
  remotePatterns.push({
    protocol: "https",
    hostname: storageHostname,
    pathname: "/storage/v1/object/public/**",
  });
}

remotePatterns.push({ protocol: "https", hostname: "via.placeholder.com" });
remotePatterns.push({ protocol: "https", hostname: "images.pexels.com" });
remotePatterns.push({ protocol: "https", hostname: "images.unsplash.com" });
remotePatterns.push({ protocol: "https", hostname: "picsum.photos" });
remotePatterns.push({ protocol: "https", hostname: "cdn.example.com" });

// ────────────── SECURITY HEADERS (CSP SAFE DEFAULTS) ──────────────
// Примечание: предыдущая строгая CSP могла блокировать runtime Next.js и давала белую страницу.
// Ниже версия, которая "практично работает" на проде. Её можно ужесточить позже,
// переведя сторонние скрипты на nonce/sha256 и сузив connect-src.

const imgHosts = [
  "images.unsplash.com",
  "images.pexels.com",
  "via.placeholder.com",
  "picsum.photos",
].concat(storageHostname ? [storageHostname] : []);

const csp = [
  "default-src 'self'",
  // картинки и медиа
  `img-src 'self' data: blob: https: www.google-analytics.com ${imgHosts.join(' ')}`,
  // скрипты: оставляем inline/eval, чтобы не ломать Next/3rd-party на текущей стадии
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.stripe.com https://va.vercel-scripts.com https://www.googletagmanager.com https://www.google-analytics.com",
  // стили: временно разрешаем inline
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // сетевые запросы: пока разрешаем https к любым доменам (Supabase, Stripe, аналитики)
  "connect-src 'self' https: https://www.google-analytics.com https://www.googletagmanager.com",
  // веб-воркеры и модули
  "worker-src 'self' blob:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.googletagmanager.com",
  // запрет встраивания
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // помогает принудительно ходить по https, если где-то остались http-ссылки
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Включай HSTS только если 100% весь трафик идёт по HTTPS на основном домене
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
];

const require = createRequire(import.meta.url);

const withBundleAnalyzer =
  (() => {
    try {
      // Optional: only active when ANALYZE=1 and when the package is installed
      // (keeps CI/dev flowing even if @next/bundle-analyzer is absent)
      return require("@next/bundle-analyzer")({
        enabled: process.env.ANALYZE === "1" || process.env.ANALYZE === "true",
      });
    } catch {
      return (config: NextConfig) => config;
    }
  })();

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60, // 1h CDN TTL hint
  },
  experimental: {
    externalDir: true,
    optimizePackageImports: ["lucide-react"],
  },
  transpilePackages: ["@shared", "@casino-affiliate/types", "@ui"],
  productionBrowserSourceMaps: process.env.NEXT_PROD_SOURCE_MAPS === "1",
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.devtool = "source-map";
    }
    return config;
  },
  async redirects() {
    return [
      // Canonicalize product URLs: strip trailing slash
      {
        source: "/products/:slug*/",
        destination: "/products/:slug*",
        permanent: true,
      },
      {
        source: "/products/",
        destination: "/products",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      // Long-term immutable cache for Next static assets
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Sensitive / personal APIs must not be cached
      {
        source:
          "/api/(account|orders|profile|payments|checkout|auth|ecom-wishlist|recent-views|customer-portal|bootstrap-admin|admin|track|metrics)/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      // Catalog APIs: allow revalidation window
      {
        source: "/api/catalog/:path*",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=120, stale-while-revalidate=300" }],
      },
      {
        source: "/api/ecom-products",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=120, stale-while-revalidate=300" }],
      },
      // Security headers for everything else
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);


