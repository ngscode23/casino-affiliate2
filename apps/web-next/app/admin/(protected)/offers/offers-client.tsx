"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Button from "@ui/components/common/button";
import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";
import { supabase } from "@shared/lib/supabase";

type OfferRow = {
  slug: string;
  name: string;
  license: string | null;
  rating: number | null;
  enabled: boolean | null;
  position: number | null;
};

export function OffersClient() {
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("offers")
          .select("slug,name,license,rating,enabled,position")
          .order("position", { ascending: true, nullsFirst: true })
          .order("name", { ascending: true });
        if (error) throw error;
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          toast(err instanceof Error ? err.message : String(err), { variant: "error" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Offers</h1>
        <Link href="/admin/offers/new">
          <Button>New offer</Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="border-b border-border/40 bg-card text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Slug</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">License</th>
                <th className="p-3 text-left">Rating</th>
                <th className="p-3 text-left">Enabled</th>
                <th className="w-32 p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-b border-border/20">
                    <td colSpan={6} className="p-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    No offers found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.slug} className="border-b border-border/20 transition-colors hover:bg-card/60">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{row.slug}</td>
                    <td className="p-3 text-foreground">{row.name}</td>
                    <td className="p-3 text-muted-foreground">{row.license ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {row.rating != null ? row.rating.toFixed(1) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{row.enabled ? "Yes" : "No"}</td>
                    <td className="p-3">
                      <Link href={`/admin/offers/${encodeURIComponent(row.slug)}`} className="text-primary underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Section>
  );
}
