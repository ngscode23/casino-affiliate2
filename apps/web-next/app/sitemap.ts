// apps/web-next/app/sitemap.ts
import type { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin =
    process.env.NEXT_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}` : "https://neon4.vercel.app");
  const entries: MetadataRoute.Sitemap = [
    { url: `${origin}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${origin}/products`, priority: 0.8, changeFrequency: "daily" },
    { url: `${origin}/wishlist`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${origin}/contact`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${origin}/affiliate`, priority: 0.5, changeFrequency: "monthly" },
  ];

  try {
    const supabase = await createClient();
    // Include only publicly visible products
    const { data, error } = await supabase
      .from("products")
      .select("slug, updated_at, created_at, status")
      .limit(1000);

    if (!error) {
      (data || []).forEach((row: any) => {
        if (!row?.slug) return;
        const status = String(row.status ?? "").toLowerCase();
        if (status && !["published", "active"].includes(status)) return;
        if (/^admin/i.test(row.slug)) return;

        entries.push({
          url: `${origin}/products/${encodeURIComponent(row.slug)}`,
          changeFrequency: "weekly",
          lastModified: row.updated_at
            ? new Date(row.updated_at)
            : row.created_at
              ? new Date(row.created_at)
              : undefined,
        });
      });
    }
  } catch {
    // If Supabase is unavailable, return the static entries above
  }

  return entries;
}

