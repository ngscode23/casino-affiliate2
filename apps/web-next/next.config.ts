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
remotePatterns.push({ protocol: "https", hostname: "cdn.example.com" });

// ────────────── SECURITY HEADERS (CSP SAFE DEFAULTS) ──────────────
// Примечание: предыдущая строгая CSP могла блокировать runtime Next.js и давала белую страницу.
// Ниже версия, которая "практично работает" на проде. Её можно ужесточить позже,
// переведя сторонние скрипты на nonce/sha256 и сузив connect-src.

const imgHosts = [
  "images.unsplash.com",
  "images.pexels.com",
  "via.placeholder.com",
].concat(storageHostname ? [storageHostname] : []);

const csp = [
  "default-src 'self'",
  // картинки и медиа
  `img-src 'self' data: blob: https: ${imgHosts.join(' ')}`,
  // скрипты: оставляем inline/eval, чтобы не ломать Next/3rd-party на текущей стадии
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.stripe.com https://va.vercel-scripts.com",
  // стили: временно разрешаем inline
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // сетевые запросы: пока разрешаем https к любым доменам (Supabase, Stripe, аналитики)
  "connect-src 'self' https:",
  // веб-воркеры и модули
  "worker-src 'self' blob:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
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
      {
        source: "/admin/cms",
        destination: "https://YOUR_CMS_SUBDOMAIN",
        permanent: true,
      },
      {
        source: "/admin/cms/:path*",
        destination: "https://YOUR_CMS_SUBDOMAIN/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);


