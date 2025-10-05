import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storageHostname = (() => {
  if (!storageUrl) return undefined;
  try {
    return new URL(storageUrl).hostname;
  } catch (error) {
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

remotePatterns.push({
  protocol: "https",
  hostname: "via.placeholder.com",
});

remotePatterns.push({
  protocol: "https",
  hostname: "images.pexels.com",
});

remotePatterns.push({
  protocol: "https",
  hostname: "images.unsplash.com",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@shared", "@casino-affiliate/types", "@ui"],
};

export default nextConfig;
