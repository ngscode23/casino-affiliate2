// netlify/functions/products-upsert.ts
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // строго сервисный ключ
);

const BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || 'product-images';

type IncomingProduct = {
  sku: string;
  title: string;
  description?: string;
  price: number;
  category_id?: string;
  imageUrl?: string;
  is_active?: boolean;
  // image_path может прийти снаружи — мы его перезапишем, если imageUrl задан
};

const guessExt = (ct?: string, url?: string) => {
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

export const handler = async (event: any) => {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, body: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
    }

    const items: IncomingProduct[] = JSON.parse(event.body || '[]');
    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: 'Body must be a non-empty JSON array' };
    }

    for (const p of items) {
      if (p.imageUrl) {
        const res = await fetch(p.imageUrl);
        if (!res.ok) throw new Error(`Image fetch failed for ${p.sku}: HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const ct = res.headers.get('content-type') || undefined;
        const ext = guessExt(ct, p.imageUrl);
        const relPath = `${p.sku}/main.${ext}`; // путь ВНУТРИ бакета
        const { error: upErr } = await supa.storage.from(BUCKET).upload(relPath, buf, {
          upsert: true,
          contentType: ct || `image/${ext}`,
          cacheControl: '31536000',
        });
        if (upErr) throw new Error(`Upload failed for ${p.sku}: ${upErr.message}`);
        (p as any).image_path = `${BUCKET}/${relPath}`; // сохраняем с именем бакета
      }
      if (p.is_active === undefined) p.is_active = true;
    }

    // В БД кладём только допустимые поля
    const payload = items.map(p => ({
      sku: p.sku,
      title: p.title,
      description: p.description ?? null,
      price: p.price,
      category_id: p.category_id ?? null,
      image_path: (p as any).image_path ?? null,
      is_active: p.is_active ?? true,
    }));

    const { data, error } = await supa
      .from('shop.products') // именно таблица, не view
      .upsert(payload, { onConflict: 'sku' })
      .select('sku,image_path');

    if (error) throw new Error(`DB upsert failed: ${error.message}`);

    return { statusCode: 200, body: JSON.stringify({ ok: true, updated: data }) };
  } catch (e: any) {
    // отдай стек — на деве это полезно, в проде можно обрезать
    return { statusCode: 500, body: `products-upsert error: ${e?.message || e}` };
  }
};