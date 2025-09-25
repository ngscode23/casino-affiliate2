import { ZodError } from 'zod';
import { getServiceClient } from '@shared/netlify/shared/auth/supabase';
import { normalizeSku, slugifyTitle } from '@shared/netlify/shared/normalize';
import { ProductIn } from '@shared/netlify/shared/schema';

const supa = getServiceClient();

const BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || 'product-images';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const MAX_ITEMS = 100;
const FETCH_TIMEOUT_MS = 15000;
const ALLOWED_CONTENT = /^image\//i;

const guessExt = (ct?: string | null, url?: string) => {
  const map: Record<string, string> = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/avif': 'avif',
  };
  if (ct && map[ct]) return map[ct];
  const m = (url || '').toLowerCase().match(/\.(webp|png|jpe?g|avif)(\?|#|$)/);
  return m ? m[1].replace('jpeg', 'jpg') : 'webp';
};

function safeSegment(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'product';
}

function publicUrl(path: string): string | null {
  if (!SUPABASE_URL) return null;
  const encoded = path
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${encoded}`;
}

export const handler = async (event: any) => {
  try {
    const raw = JSON.parse(event.body || '[]');
    if (!Array.isArray(raw) || raw.length === 0) {
      return { statusCode: 400, body: 'Body must be a non-empty JSON array' };
    }
    if (raw.length > MAX_ITEMS) {
      return { statusCode: 413, body: `Too many items (max ${MAX_ITEMS})` };
    }

    let items: ProductIn[];
    try {
      items = raw.map((entry) => ProductIn.parse(entry));
    } catch (err) {
      if (err instanceof ZodError) {
        return {
          statusCode: 400,
          body: `Validation failed: ${err.issues.map((issue) => issue.message).join(', ')}`,
        };
      }
      throw err;
    }

    const uploadResults: Record<string, { path: string; publicUrl: string | null; sourceUrl: string | undefined }> = {};
    const skuBySlug: Record<string, string> = {};
    const slugCounts = new Map<string, number>();
    const skuCounts = new Map<string, number>();

    const productsMeta = items.map((item) => {
      const normalizedSku = normalizeSku(item.sku, item.title);
      const skuCount = (skuCounts.get(normalizedSku) ?? 0) + 1;
      skuCounts.set(normalizedSku, skuCount);
      const uniqueSku = skuCount === 1 ? normalizedSku : `${normalizedSku}_${skuCount}`;

      const baseSlug = slugifyTitle(item.title, uniqueSku);
      const slugCount = (slugCounts.get(baseSlug) ?? 0) + 1;
      slugCounts.set(baseSlug, slugCount);
      const uniqueSlug = slugCount === 1 ? baseSlug : `${baseSlug}-${slugCount}`;

      skuBySlug[uniqueSlug] = uniqueSku;

      return {
        raw: item,
        slug: uniqueSlug,
        sku: uniqueSku,
      };
    });

    for (const meta of productsMeta) {
      const item = meta.raw;
      if (!item.imageUrl) continue;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(item.imageUrl, { signal: controller.signal });
      } catch (fetchErr: any) {
        if (controller.signal.aborted) {
          throw new Error(`Image fetch timeout for ${item.imageUrl}`);
        }
        throw fetchErr;
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        throw new Error(`Image fetch failed for ${item.imageUrl}: HTTP ${res.status}`);
      }

      const ct = res.headers.get('content-type');
      if (ct && !ALLOWED_CONTENT.test(ct)) {
        throw new Error(`Unsupported image content-type: ${ct}`);
      }

      const buf = Buffer.from(await res.arrayBuffer());
      const ext = guessExt(ct, item.imageUrl);
      const safeFolder = safeSegment(meta.sku);
      const relPath = `${safeFolder}/main-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

      const { error: uploadError } = await supa.storage.from(BUCKET).upload(relPath, buf, {
        upsert: true,
        contentType: ct || `image/${ext}`,
        cacheControl: '31536000',
      });
      if (uploadError) {
        throw new Error(`Upload failed for ${item.imageUrl}: ${uploadError.message}`);
      }

      uploadResults[meta.slug] = {
        path: relPath,
        publicUrl: publicUrl(relPath),
        sourceUrl: item.imageUrl,
      };
    }

const payload = productsMeta.map((meta) => {
  const upload = uploadResults[meta.slug];
  const row: Record<string, unknown> = {
    slug: meta.slug,
    sku: meta.sku,
    title: meta.raw.title,
    price: meta.raw.price,
    rating: 0,
    short_desc: meta.raw.description ?? null,
    category_slug: meta.raw.category_id ?? null,
    status: meta.raw.is_active === false ? 'draft' : 'published',
  };
  if (upload?.publicUrl) {
    row.images = [upload.publicUrl];
  }
  return row;
});

    const { data: upserted, error } = await supa
      .from('ecom_products')
      .upsert(payload, { onConflict: 'slug' })
      .select('id, slug, sku');

    if (error) throw new Error(`DB upsert failed: ${error.message}`);

    const versionRows: Array<Record<string, unknown>> = [];
    const rpcCalls: Array<Promise<void>> = [];

    for (const row of upserted || []) {
      const slug = row.slug as string;
      const upload = uploadResults[slug];
      if (upload && upload.path && row.id) {
        const skuValue = (row as any).sku || skuBySlug[slug] || slug;
        versionRows.push({
          product_id: row.id,
          sku: skuValue,
          path: upload.path,
          source_url: upload.sourceUrl ?? null,
          uploaded_by: null,
          is_current: true,
          metadata: null,
        });

        rpcCalls.push((async () => {
          const { error: rpcError } = await supa.rpc('set_product_image', {
            p_product_id: row.id,
            p_sku: skuValue,
            p_path: upload.path,
            p_source_url: upload.sourceUrl ?? upload.publicUrl ?? null,
            p_uploaded_by: null,
          });
          if (rpcError) {
            console.warn('set_product_image rpc failed', rpcError);
          }
        })());
      }
    }

    if (versionRows.length) {
      await supa.from('ecom_product_image_versions').insert(versionRows);
    }

    if (rpcCalls.length) {
      await Promise.all(rpcCalls);
    }

    await syncCatalog((upserted || []).map((row) => row.id));

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        updated: (upserted || []).map((row) => ({
          id: row.id,
          slug: row.slug,
          sku: row.sku,
        })),
      }),
    };
  } catch (e: any) {
    const msg = String(e?.message || e);
    const isUnique = /duplicate key value|unique constraint/i.test(msg);
    const status = isUnique ? 409 : 500;
    return { statusCode: status, body: `products-upsert error: ${msg}` };
  }
};

async function syncCatalog(ids: string[]): Promise<void> {
  if (!ids.length) return;
  try {
    const { data, error } = await supa
      .from('ecom_products')
      .select('id, title, slug')
      .in('id', ids);
    if (error || !Array.isArray(data)) {
      if (error) console.warn('catalog fetch failed', error.message);
      return;
    }
    const rows = data.map((row) => ({
      source_schema: 'public',
      source_table: 'ecom_products',
      source_pk: String(row.id),
      title: row.title ?? null,
      slug: row.slug ?? null,
    }));
    if (!rows.length) return;
    const { error: catalogError } = await supa
      .from('product_catalog')
      .upsert(rows, { onConflict: 'source_schema,source_table,source_pk' });
    if (catalogError) {
      console.warn('catalog upsert failed', catalogError.message || catalogError);
    }
  } catch (catalogErr) {
    console.warn('catalog sync error', catalogErr);
  }
}



