import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Button from "@/components/common/button";
import { supabase } from "@/lib/supabase";

type Category = { slug: string; name: string };

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ShopProductEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [shortDesc, setShortDesc] = useState("");
  const [tags, setTags] = useState<string>("");
  const [imagesJson, setImagesJson] = useState<string>("[]");
  const [specsJson, setSpecsJson] = useState<string>("{}");

  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // load categories
        const { data: catsData } = await (supabase as any)
          .from("ecom_categories")
          .select("slug,name")
          .order("name");
        if (!cancelled) setCats(catsData || []);

        if (!isNew && id) {
          const { data, error } = await (supabase as any)
            .from("ecom_products")
            .select("id,slug,title,price,rating,images,short_desc,category_slug,tags,specs")
            .eq("id", id)
            .single();
          if (error) throw error;
          if (data && !cancelled) {
            setTitle(data.title || "");
            setSlug(data.slug || "");
            setPrice(Number(data.price) || 0);
            setCategory(data.category_slug || "");
            setRating(Number(data.rating) || 0);
            setShortDesc(data.short_desc || "");
            setTags((data.tags || []).join(", "));
            setImagesJson(JSON.stringify(data.images || [], null, 2));
            setSpecsJson(JSON.stringify(data.specs || {}, null, 2));
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isNew]);

  useEffect(() => {
    if (!isNew) return;
    if (!title) return;
    setSlug((prev) => (prev ? prev : slugify(title)));
  }, [title, isNew]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // parse fields
      let images: any = [];
      let specs: any = {};
      try { images = JSON.parse(imagesJson || "[]"); } catch { images = []; }
      try { specs = JSON.parse(specsJson || "{}"); } catch { specs = {}; }
      const tagsArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const payload: any = {
        slug: slug || slugify(title),
        title,
        price,
        rating,
        short_desc: shortDesc,
        category_slug: category || null,
        tags: tagsArr,
        images,
        specs,
      };
      if (!isNew) payload.id = id;

      const { data, error } = await (supabase as any)
        .from("ecom_products")
        .upsert(payload)
        .select("id")
        .single();
      if (error) throw error;
      const pid = data?.id as string;
      nav(`/admin/shop/products/${pid}`, { replace: true });
    } catch (e: any) {
      setError(e?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? "New Product" : "Edit Product"}</h1>
      </div>

      <Card className="p-6 max-w-3xl">
        {loading ? (
          <div>Loading…</div>
        ) : (
          <form onSubmit={onSave} className="space-y-4">
            <div>
              <label className="block text-sm">Title</label>
              <input className="w-full rounded-md border px-3 py-2" value={title} onChange={(e) => setTitle(e.currentTarget.value)} required />
            </div>
            <div>
              <label className="block text-sm">Slug</label>
              <input className="w-full rounded-md border px-3 py-2" value={slug} onChange={(e) => setSlug(e.currentTarget.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm">Price</label>
                <input type="number" step="0.01" className="w-full rounded-md border px-3 py-2" value={price} onChange={(e) => setPrice(Number(e.currentTarget.value))} required />
              </div>
              <div>
                <label className="block text-sm">Rating</label>
                <input type="number" step="0.1" min={0} max={5} className="w-full rounded-md border px-3 py-2" value={rating} onChange={(e) => setRating(Number(e.currentTarget.value))} />
              </div>
              <div>
                <label className="block text-sm">Category</label>
                <select className="w-full rounded-md border px-3 py-2" value={category} onChange={(e) => setCategory(e.currentTarget.value)}>
                  <option value="">—</option>
                  {cats.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm">Short description</label>
              <textarea className="w-full rounded-md border px-3 py-2" rows={2} value={shortDesc} onChange={(e) => setShortDesc(e.currentTarget.value)} />
            </div>
            <div>
              <label className="block text-sm">Tags (comma separated)</label>
              <input className="w-full rounded-md border px-3 py-2" value={tags} onChange={(e) => setTags(e.currentTarget.value)} />
            </div>
            <div>
              <label className="block text-sm">Images (JSON array of URLs)</label>
              <textarea className="w-full rounded-md border font-mono text-xs px-3 py-2" rows={4} value={imagesJson} onChange={(e) => setImagesJson(e.currentTarget.value)} />
            </div>
            <div>
              <label className="block text-sm">Specs (JSON object)</label>
              <textarea className="w-full rounded-md border font-mono text-xs px-3 py-2" rows={4} value={specsJson} onChange={(e) => setSpecsJson(e.currentTarget.value)} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              <Button type="button" onClick={() => nav("/admin/shop/products")}>Back to list</Button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
        )}
      </Card>
    </Section>
  );
}

