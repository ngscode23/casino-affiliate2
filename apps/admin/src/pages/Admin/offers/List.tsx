import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Button from "@ui/components/common/button";
import { supabase } from "@shared/lib/supabase";

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
          <thead className="bg-card">
            <tr>
              <th className="p-3 text-left text-muted uppercase text-xs tracking-wide">Slug</th>
              <th className="p-3 text-left text-muted uppercase text-xs tracking-wide">Name</th>
              <th className="p-3 text-left text-muted uppercase text-xs tracking-wide">License</th>
              <th className="p-3 text-left text-muted uppercase text-xs tracking-wide">Rating</th>
              <th className="p-3 text-left text-muted uppercase text-xs tracking-wide">Enabled</th>
              <th className="w-1 p-3 text-left text-muted uppercase text-xs tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={6}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-3" colSpan={6}>Empty</td></tr>
            ) : rows.map(r => (
              <tr key={r.slug} className="border-t border-border hover:bg-slate-50 transition-colors dark:border-white/10 dark:hover:bg-white/5">
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



