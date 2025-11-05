import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const supabase = getAdminClient();

  const [
    siteSettingsRes,
    navigationLinksRes,
    contentBlocksRes,
    pageSectionsRes,
    mediaAssetsRes,
    translationsRes,
    featureTogglesRes,
  ] = await Promise.all([
    supabase
      .from("site_settings")
      .select("*")
      .order("key", { ascending: true })
      .order("locale", { ascending: true }),
    supabase
      .from("navigation_links")
      .select("*")
      .order("menu", { ascending: true })
      .order("locale", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("content_blocks")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("page_sections")
      .select("*")
      .order("page_path", { ascending: true })
      .order("locale", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("translations")
      .select("*")
      .order("locale", { ascending: true })
      .order("tkey", { ascending: true }),
    supabase
      .from("feature_toggles")
      .select("*")
      .order("key", { ascending: true }),
  ]);

  const firstError =
    siteSettingsRes.error ||
    navigationLinksRes.error ||
    contentBlocksRes.error ||
    pageSectionsRes.error ||
    mediaAssetsRes.error ||
    translationsRes.error ||
    featureTogglesRes.error;

  if (firstError) {
    return json(
      {
        ok: false,
        error: "cms_state_fetch_failed",
        message: firstError.message,
      },
      500,
    );
  }

  const locales = new Set<string>();
  const menus = new Set<string>();

  for (const row of siteSettingsRes.data ?? []) {
    if (typeof row?.locale === "string") {
      const normalized = row.locale.trim();
      if (normalized) locales.add(normalized);
    }
  }

  for (const row of navigationLinksRes.data ?? []) {
    if (typeof row?.locale === "string") {
      const normalized = row.locale.trim();
      if (normalized) locales.add(normalized);
    }
    if (typeof row?.menu === "string") {
      const normalizedMenu = row.menu.trim();
      if (normalizedMenu) menus.add(normalizedMenu);
    }
  }

  for (const row of contentBlocksRes.data ?? []) {
    if (typeof row?.locale === "string") {
      const normalized = row.locale.trim();
      if (normalized) locales.add(normalized);
    }
  }

  for (const row of pageSectionsRes.data ?? []) {
    if (typeof row?.locale === "string") {
      const normalized = row.locale.trim();
      if (normalized) locales.add(normalized);
    }
  }

  for (const row of translationsRes.data ?? []) {
    if (typeof row?.locale === "string") {
      const normalized = row.locale.trim();
      if (normalized) locales.add(normalized);
    }
  }

  return json({
    ok: true,
    siteSettings: siteSettingsRes.data ?? [],
    navigationLinks: navigationLinksRes.data ?? [],
    contentBlocks: contentBlocksRes.data ?? [],
    pageSections: pageSectionsRes.data ?? [],
    mediaAssets: mediaAssetsRes.data ?? [],
    translations: translationsRes.data ?? [],
    featureToggles: featureTogglesRes.data ?? [],
    locales: Array.from(locales),
    menus: Array.from(menus),
  });
}
