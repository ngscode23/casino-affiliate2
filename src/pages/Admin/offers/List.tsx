import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Button from "@/components/common/button";
import { supabase } from "@/lib/supabase";

type Row = {
  slug: string;
  name: string;
  license: "MGA"|"UKGC"|"Curaçao"|"Other";
  rating: number;
  enabled: boolean;
  position: number | null;
};

export default function OffersList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("offers")
      .select("slug,name,license,rating,enabled,position")
      .order("position", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });
    setLoading(false);
    if (error) { alert(error.message); return; }
    setRows(data || []);
  }

  useEffect(() => { load(); }, []);

  return (
    <Section className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Offers</h1>
        <Link to="../offers/new"><Button>New Offer</Button></Link>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/10">
            <tr>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">License</th>
              <th className="text-left p-3">Rating</th>
              <th className="text-left p-3">Enabled</th>
              <th className="text-left p-3 w-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={6}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-3" colSpan={6}>Empty</td></tr>
            ) : rows.map(r => (
              <tr key={r.slug} className="border-t border-white/10">
                <td className="p-3">{r.slug}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.license}</td>
                <td className="p-3">{r.rating?.toFixed?.(1) ?? "—"}</td>
                <td className="p-3">{r.enabled ? "Yes" : "No"}</td>
                <td className="p-3">
                  <Link className="underline" to={`../offers/${encodeURIComponent(r.slug)}`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Section>
  );
}


