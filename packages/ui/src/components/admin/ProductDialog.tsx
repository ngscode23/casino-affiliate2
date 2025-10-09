'use client';
/* eslint-disable @next/next/no-img-element */

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogClose } from "@ui/components/common/dialog";
import { useEffect, useState } from "react";
import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";
import { getValidAccessToken } from "@shared/lib/auth";
import { adminFetch } from "@shared/lib/api";
import { normalizeSku, slugifyTitle } from "@shared/lib/normalize";

export type ProductInput = {
  id?: string;
  title: string;
  slug: string;
  sku: string;
  price: number;
  category_slug: string | null;
  status: 'draft'|'published'|'archived';
  short_desc?: string;
  tags?: string[];
  images?: string[];
  rating?: number;
  specs?: Record<string, any>;
};

export default function ProductDialog({ open, onOpenChange, initial, categories, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<ProductInput> | null;
  categories: Array<{ slug: string; name: string; color?: string }>;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [sku, setSku] = useState(initial?.sku || initial?.slug || '');
  // Keep price as string to allow free typing (avoid Number('') -> 0 issue)
  const [priceStr, setPriceStr] = useState<string>(
    initial?.price !== undefined && initial?.price !== null ? String(initial?.price) : ""
  );
  const [category, setCategory] = useState<string>(initial?.category_slug || '');
  const [status, setStatus] = useState<'draft'|'published'|'archived'>((initial?.status as any) || 'published');
  const [saving, setSaving] = useState(false);
  const [shortDesc, setShortDesc] = useState(initial?.short_desc || '');
  const [tagsCsv, setTagsCsv] = useState((initial?.tags || []).join(', '));
  const [imagesJson, setImagesJson] = useState(()=>{
    try { return JSON.stringify(initial?.images || [], null, 2) } catch { return '[]' }
  });
  const [imagesParseError, setImagesParseError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initial?.title || '');
    setSlug(initial?.slug || '');
    setSku(initial?.sku || initial?.slug || '');
    setPriceStr(initial?.price !== undefined && initial?.price !== null ? String(initial?.price) : "");
    setCategory(initial?.category_slug || '');
    setStatus((initial?.status as any) || 'published');
    setShortDesc(initial?.short_desc || '');
    setTagsCsv((initial?.tags || []).join(', '));
    try { setImagesJson(JSON.stringify(initial?.images || [], null, 2)); } catch { setImagesJson('[]'); }
  }, [initial, open]);

  useEffect(() => {
    if (!initial?.id) {
      setSlug((prev) => (prev ? prev : slugifyTitle(title, sku)));
      setSku((prev) => (prev ? prev : normalizeSku(undefined, title)));
    }
  }, [title, sku, initial?.id]);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast('Title is required', { variant: 'error' }); return; }
    const price = parseFloat(String(priceStr).replace(',', '.'));
    if (!Number.isFinite(price)) { toast('Price must be a number', { variant: 'error' }); return; }
    try {
      setSaving(true);
      let images: any = [];
      try { images = JSON.parse(imagesJson || '[]'); setImagesParseError(null); }
      catch (err: any ) { setImagesParseError('Invalid JSON'); toast('Images JSON is invalid', { variant: 'error' }); setSaving(false); void err ; return; }
      const tags = (tagsCsv || '').split(',').map(s=>s.trim()).filter(Boolean);
      const normalizedSku = normalizeSku(sku, title);
      const normalizedSlug = slugifyTitle(slug, normalizedSku);

      const payload: any = {
        id: initial?.id,
        title: title.trim(),
        slug: normalizedSlug,
        sku: normalizedSku,
        price,
        rating: Number(initial?.rating || 0),
        short_desc: shortDesc,
        category_slug: category || null,
        images,
        tags,
        specs: initial?.specs || {},
        status,
       
      };
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('Not authenticated');
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      const res = await adminFetch('/api/admin-products', {
        method: 'POST',
        headers,
        body: JSON.stringify({ op: 'upsert', product: payload })
      });
      if (!res.ok) throw new Error(await res.text());
      toast('Saved', { variant: 'success' });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast(String(e?.message || e), { variant: 'error' });
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[720px] max-w-[95vw] rounded-2xl border border-white/15 bg-[rgb(var(--bg-1))] p-4 shadow-2xl shadow-black/40">
          <DialogTitle className="text-lg font-semibold mb-2">{initial?.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription id="product-dialog-desc" className="sr-only">Edit or add product details</DialogDescription>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Title</label>
              <input className="w-full rounded-md border border-border bg-white px-3 py-2 text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white" value={title} onChange={(e)=>setTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Slug</label>
                <input className="w-full rounded-md border border-border bg-white px-3 py-2 text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white" value={slug} onChange={(e)=>setSlug(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm mb-1">Price</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white"
                  value={priceStr}
                  onChange={(e)=>setPriceStr(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select className="w-full rounded-md border border-border bg-white px-3 py-2 text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white" value={category} onChange={(e)=>setCategory(e.target.value)}>
                  <option value="">-</option>
                  {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">SKU</label>
                <input
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white"
                  value={sku}
                  onChange={(e)=>setSku(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select className="w-full rounded-md border border-border bg-white px-3 py-2 text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white" value={status} onChange={(e)=>setStatus(e.target.value as any)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Short description</label>
              <textarea className="w-full rounded-md border border-border bg-white px-3 py-2 text-text shadow-sm min-h-[70px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white" value={shortDesc} onChange={(e)=>setShortDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Tags (CSV)</label>
                <input className="w-full rounded-md border border-border bg-white px-3 py-2 text-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white" value={tagsCsv} onChange={(e)=>setTagsCsv(e.target.value)} placeholder="gaming, accessories" />
              </div>
              <div>
                <label className="block text-sm mb-1">Images (JSON array of URLs)</label>
                <textarea className="w-full rounded-md border border-border bg-white px-3 py-2 text-text shadow-sm font-mono text-xs min-h-[110px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white" value={imagesJson} onChange={(e)=>setImagesJson(e.target.value)} />
                {imagesParseError && <div className="text-xs text-red-400">{imagesParseError}</div>}
              </div>
            </div>
            {/* Preview */}
            <div className="flex items-center gap-2">
              {(() => { try { return (JSON.parse(imagesJson||'[]')||[]).slice(0,3).map((u:string,i:number)=>(<img key={i} src={u} alt="" className="w-10 h-10 rounded object-cover border border-white/10"/>)); } catch { return null } })()}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>{saving? 'Saving.' : 'Save'}</Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}


