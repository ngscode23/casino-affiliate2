"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Button from "@ui/components/common/button";
import { supabase } from "@shared/lib/supabase";
import { toast } from "@ui/components/common/toast";

type License = "MGA" | "UKGC" | "Curaçao" | "Other";

interface FormValues {
  slug: string;
  name: string;
  license: License;
  rating: number;
  payout: string;
  enabled: boolean;
  payout_hours: number | null;
  methods_csv: string;
  link: string;
  position: number | null;
}

interface OfferEditorClientProps {
  slug: string;
}

function csvToArray(csv?: string): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function sanitizeLink(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function OfferEditorClient({ slug }: OfferEditorClientProps) {
  const router = useRouter();
  const isNew = !slug || slug === "new";

  const defaultValues = useMemo<FormValues>(
    () => ({
      slug: "",
      name: "",
      license: "Other",
      rating: 0,
      payout: "",
      enabled: true,
      payout_hours: null,
      methods_csv: "",
      link: "",
      position: null,
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues,
    mode: "onBlur",
  });

  useEffect(() => {
    if (isNew) {
      reset(defaultValues);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("offers")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (error) throw error;
        if (!data || cancelled) return;

        reset({
          slug: data.slug ?? "",
          name: data.name ?? "",
          license: (data.license as License) ?? "Other",
          rating: Number(data.rating ?? 0),
          payout: data.payout ?? "",
          enabled: Boolean(data.enabled ?? true),
          payout_hours: data.payout_hours ?? null,
          methods_csv: Array.isArray(data.methods) ? data.methods.join(", ") : "",
          link: data.link ?? "",
          position: data.position ?? null,
        });
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), { variant: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultValues, isNew, reset, slug]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        slug: values.slug.trim(),
        name: values.name.trim(),
        license: values.license,
        rating: Number(values.rating ?? 0),
        payout: values.payout ?? "",
        payout_hours:
          values.payout_hours != null && !Number.isNaN(values.payout_hours)
            ? Number(values.payout_hours)
            : null,
        methods: csvToArray(values.methods_csv),
        link: sanitizeLink(values.link),
        enabled: !!values.enabled,
        position:
          values.position != null && !Number.isNaN(values.position)
            ? Number(values.position)
            : null,
      };

      if (!payload.slug) {
        toast("Slug is required", { variant: "error" });
        return;
      }

      const { error } = await supabase.from("offers").upsert(payload, { onConflict: "slug" });
      if (error) throw error;

      toast("Offer saved", { variant: "success" });
      router.replace("/admin/offers");
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), { variant: "error" });
    }
  });

  const handleDelete = async () => {
    if (isNew) {
      reset(defaultValues);
      return;
    }
    const confirmed = typeof window !== "undefined" ? window.confirm("Delete this offer?") : false;
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("offers").delete().eq("slug", slug);
      if (error) throw error;
      toast("Offer deleted", { variant: "success" });
      router.replace("/admin/offers");
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), { variant: "error" });
    }
  };

  return (
    <Section className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {isNew ? "Create Offer" : "Edit Offer"}
        </h1>
        {!isNew ? (
          <Button variant="soft" type="button" onClick={handleDelete} disabled={isSubmitting}>
            Delete
          </Button>
        ) : null}
      </div>

      <Card className="p-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="my-casino"
              {...register("slug", { required: "Slug is required" })}
            />
            {errors.slug ? (
              <p className="mt-1 text-xs text-rose-500">{errors.slug.message as string}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Casino Name"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-rose-500">{errors.name.message as string}</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">License</label>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                {...register("license")}
              >
                <option value="MGA">MGA</option>
                <option value="UKGC">UKGC</option>
                <option value="Curaçao">Curaçao</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Rating (0–5)</label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                {...register("rating", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Payout</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Instant / 1-24h"
                {...register("payout")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Payout hours</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                {...register("payout_hours", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Methods (CSV)</label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="visa, mastercard, skrill"
              {...register("methods_csv")}
            />
          </div>

  <div>
    <label className="mb-1 block text-sm font-medium">Link</label>
    <input
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      placeholder="https://… or /go/slug"
      {...register("link")}
    />
  </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Position</label>
            <input
              type="number"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              {...register("position", { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input id="enabled" type="checkbox" {...register("enabled")} defaultChecked />
            <label htmlFor="enabled" className="text-sm text-foreground">
              Enabled
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => reset(defaultValues)}>
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </Section>
  );
}
