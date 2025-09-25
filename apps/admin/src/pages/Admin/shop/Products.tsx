import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Button from "@ui/components/common/button";
import { supabase } from "@shared/lib/supabase";

type Product = {
  id: string;
  slug: string;
  title: string;
  price: number;
  category_slug: string | null;
  rating: number;
  created_at: string;
};

export default function ShopProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("ecom_products")
          .select("id,slug,title,price,category_slug,rating,created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        if (!cancelled) setItems(data || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Section className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shop · Products</h1>
        <Link to="/shop/products/new"><Button>New Product</Button></Link>
      </div>

      <Card className="p-4 overflow-x-auto">
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 px-2">Title</th>
                <th className="py-2 px-2">Slug</th>
                <th className="py-2 px-2">Category</th>
                <th className="py-2 px-2">Price</th>
                <th className="py-2 px-2">Rating</th>
                <th className="py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-white/10">
                  <td className="py-2 px-2">{p.title}</td>
                  <td className="py-2 px-2">{p.slug}</td>
                  <td className="py-2 px-2">{p.category_slug || "—"}</td>
                  <td className="py-2 px-2">${p.price.toFixed(2)}</td>
                  <td className="py-2 px-2">{p.rating?.toFixed?.(1) ?? "0.0"}</td>
                  <td className="py-2 px-2">
                    <Link className="underline" to={`/shop/products/${p.id}`}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </Section>
  );
}


