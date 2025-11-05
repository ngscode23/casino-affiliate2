import { adminFetch } from "@shared/lib/api";
import { getValidAccessToken } from "@shared/lib/auth";

export interface SiteSettingRow {
  key: string;
  locale: string;
  value_json: unknown;
  is_public: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface NavigationLinkRow {
  id: string;
  locale: string;
  menu: string;
  label: string;
  url: string;
  sort_order: number;
  published: boolean;
  is_external: boolean;
  parent_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ContentBlockRow {
  id: string;
  locale: string;
  type: string;
  slug: string | null;
  status: "draft" | "published" | "archived";
  content_json: unknown;
  published_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface PageSectionRow {
  id: string;
  page_path: string;
  locale: string;
  block_id: string;
  sort_order: number;
  is_draft: boolean;
  visible: boolean;
  published_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface MediaAssetRow {
  id: string;
  bucket: string;
  storage_key: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  alt: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  checksum: string | null;
}

export interface TranslationRow {
  id: string;
  locale: string;
  tkey: string;
  namespace: string | null;
  ns_norm?: string;
  value_text: string | null;
  value_json: unknown;
  updated_at: string;
  updated_by: string | null;
}

export interface FeatureToggleRow {
  key: string;
  description: string | null;
  value_bool: boolean | null;
  value_json: unknown;
  is_public: boolean;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface CMSState {
  siteSettings: SiteSettingRow[];
  navigationLinks: NavigationLinkRow[];
  contentBlocks: ContentBlockRow[];
  pageSections: PageSectionRow[];
  mediaAssets: MediaAssetRow[];
  translations: TranslationRow[];
  featureToggles: FeatureToggleRow[];
  locales: string[];
  menus: string[];
}

async function authorizedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const accessToken = await getValidAccessToken().catch(() => null);
  if (accessToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return adminFetch(input, { ...init, headers, cache: "no-store" });
}

function ensureOk(res: Response): Response {
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return res;
}

export async function fetchCMSState(): Promise<CMSState> {
  const res = ensureOk(await authorizedFetch("/api/admin/cms/state"));
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to load CMS state");
  }
  return {
    siteSettings: payload.siteSettings ?? [],
    navigationLinks: payload.navigationLinks ?? [],
    contentBlocks: payload.contentBlocks ?? [],
    pageSections: payload.pageSections ?? [],
    mediaAssets: payload.mediaAssets ?? [],
    translations: payload.translations ?? [],
    featureToggles: payload.featureToggles ?? [],
    locales: payload.locales ?? [],
    menus: payload.menus ?? [],
  };
}

export interface SiteSettingInput {
  key: string;
  locale: string;
  value: unknown;
  valueMode?: "json" | "text";
  isPublic?: boolean;
}

export async function upsertSiteSetting(
  input: SiteSettingInput,
): Promise<void> {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/site-settings", {
      method: "POST",
      body: JSON.stringify({
        key: input.key,
        locale: input.locale,
        value: input.value,
        valueMode: input.valueMode,
        isPublic: input.isPublic,
      }),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to save site setting");
  }
  return;
}

export async function deleteSiteSetting(key: string, locale: string) {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/site-settings", {
      method: "DELETE",
      body: JSON.stringify({ key, locale }),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to delete site setting");
  }
  return true;
}

export interface NavigationLinkInput {
  id?: string;
  locale: string;
  menu: string;
  label: string;
  url: string;
  sort_order?: number;
  is_external?: boolean;
  published?: boolean;
  parent_id?: string | null;
}

export async function upsertNavigationLink(
  input: NavigationLinkInput,
): Promise<NavigationLinkRow> {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/navigation", {
      method: "POST",
      body: JSON.stringify({
        id: input.id,
        locale: input.locale,
        menu: input.menu,
        label: input.label,
        url: input.url,
        sort_order: input.sort_order,
        is_external: input.is_external,
        published: input.published,
        parent_id: input.parent_id,
      }),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to save navigation link");
  }
  return payload.item as NavigationLinkRow;
}

export async function reorderNavigationLinks(
  updates: Array<{ id: string; sort_order: number }>,
) {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/navigation", {
      method: "PUT",
      body: JSON.stringify({ items: updates }),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to reorder navigation links");
  }
  return true;
}

export async function deleteNavigationLink(id: string) {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/navigation", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to delete navigation link");
  }
  return true;
}

export interface ContentBlockInput {
  id?: string;
  locale: string;
  type: string;
  slug?: string | null;
  status?: "draft" | "published" | "archived";
  content: unknown;
  valueMode?: "json" | "text";
  published_at?: string | null;
}

export async function upsertContentBlock(
  input: ContentBlockInput,
): Promise<ContentBlockRow> {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/content-blocks", {
      method: "POST",
      body: JSON.stringify({
        id: input.id,
        locale: input.locale,
        type: input.type,
        slug: input.slug,
        status: input.status,
        content: input.content,
        valueMode: input.valueMode,
        published_at: input.published_at,
      }),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to save content block");
  }
  return payload.item as ContentBlockRow;
}

export async function deleteContentBlock(id: string) {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/content-blocks", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to delete content block");
  }
  return true;
}

export interface PageSectionInput {
  id?: string;
  page_path: string;
  locale: string;
  block_id: string;
  sort_order?: number;
  is_draft?: boolean;
  visible?: boolean;
  published_at?: string | null;
}

export async function upsertPageSection(
  input: PageSectionInput,
): Promise<PageSectionRow> {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/page-sections", {
      method: "POST",
      body: JSON.stringify({
        id: input.id,
        page_path: input.page_path,
        locale: input.locale,
        block_id: input.block_id,
        sort_order: input.sort_order,
        is_draft: input.is_draft,
        visible: input.visible,
        published_at: input.published_at,
      }),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to save page section");
  }
  return payload.item as PageSectionRow;
}

export async function deletePageSection(id: string) {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/page-sections", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to delete page section");
  }
  return true;
}

export interface TranslationInput {
  id?: string;
  locale: string;
  tkey: string;
  namespace?: string | null;
  value: unknown;
  valueMode?: "json" | "text";
}

export async function upsertTranslation(
  input: TranslationInput,
): Promise<TranslationRow | null> {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/translations", {
      method: "POST",
      body: JSON.stringify({
        id: input.id,
        locale: input.locale,
        tkey: input.tkey,
        namespace: input.namespace,
        value: input.value,
        valueMode: input.valueMode,
      }),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to save translation");
  }
  return payload.item as TranslationRow | null;
}

export async function deleteTranslation(options: {
  id?: string;
  locale?: string;
  tkey?: string;
  namespace?: string | null;
}) {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/translations", {
      method: "DELETE",
      body: JSON.stringify(options),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to delete translation");
  }
  return true;
}

export interface MediaAssetInput {
  id?: string;
  bucket?: string;
  storage_key: string;
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
  alt?: string | null;
  description?: string | null;
}

export interface MediaAssetListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export async function listMediaAssets(params: MediaAssetListParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.limit != null) searchParams.set("limit", String(params.limit));

  const res = ensureOk(
    await authorizedFetch(
      `/api/admin/cms/media-assets${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    ),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to list media assets");
  }
  return {
    items: (payload.items ?? []) as MediaAssetRow[],
    total: payload.total as number | null,
    page: payload.page as number,
    limit: payload.limit as number,
  };
}

export async function saveMediaAsset(
  input: MediaAssetInput,
): Promise<MediaAssetRow> {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/media-assets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to save media asset");
  }
  return payload.item as MediaAssetRow;
}

export async function deleteMediaAsset(options: {
  id?: string;
  bucket?: string;
  storage_key?: string;
  remove_object?: boolean;
}) {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/media-assets", {
      method: "DELETE",
      body: JSON.stringify(options),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to delete media asset");
  }
  return true;
}

export interface MediaUploadUrlRequest {
  bucket?: string;
  folder?: string;
  filename?: string;
  contentType?: string;
}

export interface MediaUploadUrlResponse {
  bucket: string;
  path: string;
  uploadUrl: string;
  token: string;
  publicUrl: string;
}

export async function createMediaUploadUrl(
  input: MediaUploadUrlRequest,
): Promise<MediaUploadUrlResponse> {
  const res = ensureOk(
    await authorizedFetch("/api/admin/cms/media/upload-url", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
  const payload = await res.json();
  if (!payload?.ok) {
    throw new Error(payload?.message ?? "Failed to create upload url");
  }
  return {
    bucket: payload.bucket,
    path: payload.path,
    uploadUrl: payload.uploadUrl,
    token: payload.token,
    publicUrl: payload.publicUrl,
  };
}
