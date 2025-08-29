// src/pages/Admin/offers/Edit.tsx
import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Button from "@/components/common/button";
import { supabase } from "@/lib/supabase";
// добавь import типа Resolver
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
type License = "MGA" | "UKGC" | "Curaçao" | "Other";

/** number|null из инпута ("" -> null) */
const intOrNull = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().int().nullable()
);

/** link: "" -> undefined; иначе допустим либо абсолютный URL, либо относительный путь, начинающийся с "/" */
const linkSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .union([
      // абсолютный URL
      z.string().url(),
      // относительный путь (без //)
      z.string().regex(/^\/(?!\/).*/, "Must start with /"),
    ])
    .nullable()
    .optional()
);

/** ВАЖНО: rating / payout / enabled — required */
const FormSchema = z.object({
  slug: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  license: z.enum(["MGA", "UKGC", "Curaçao", "Other"]),
  rating: z.coerce.number().min(0, "Min 0").max(5, "Max 5"),
  payout: z.string(), // поле обязательно (пусть даже пустая строка)
  enabled: z.boolean(),
  payout_hours: intOrNull.optional(), // number|null|undefined
  methods_csv: z.string().optional(), // "visa, mastercard"
  link: linkSchema, // string|undefined|null
  position: intOrNull.optional(), // number|null|undefined
});
type FormValues = z.infer<typeof FormSchema>;
// Приводим тип резолвера, чтобы RHF точно знал форму данных#

const formResolver: Resolver<FormValues> =
  zodResolver(FormSchema) as unknown as Resolver<FormValues>;
  
function csvToArray(csv?: string): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminOfferEdit() {
  const nav = useNavigate();
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const editing = !!routeSlug && routeSlug !== "new";
  const defaultValues: FormValues = useMemo(
    () => ({
      slug: "",
      name: "",
      license: "Other",
      rating: 0,
      payout: "",
      enabled: true,
      payout_hours: null,
      methods_csv: "",
      link: null,
      position: null,
    }),
    []
  );

const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  reset,
} = useForm<FormValues>({
  resolver: formResolver,
  defaultValues,
  mode: "onBlur",
});

  // Load existing record when editing
  useEffect(() => {
    (async () => {
      try {
        if (!editing || !routeSlug) return;
        const s = decodeURIComponent(routeSlug);
        const { data, error } = await (supabase as any)
          .from("offers")
          .select("*")
          .eq("slug", s)
          .maybeSingle();
        if (error) throw error;
        if (!data) return;
        const row = data as any;
        reset({
          slug: row.slug || "",
          name: row.name || "",
          license: row.license || "Other",
          rating: Number(row.rating ?? 0),
          payout: row.payout || "",
          enabled: !!row.enabled,
          payout_hours: row.payout_hours ?? null,
          methods_csv: Array.isArray(row.methods) ? row.methods.join(", ") : "",
          link: row.link ?? null,
          position: row.position ?? null,
        });
      } catch (e: any) {
        alert("Load error: " + (e?.message ?? e));
      }
    })();
  }, [editing, routeSlug, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const methods = csvToArray(values.methods_csv);

    const payload = {
      slug: values.slug,
      name: values.name,
      license: values.license as License,
      rating: values.rating,
      payout: values.payout ?? "",
      payout_hours: values.payout_hours ?? null,
      methods,
      link: values.link ?? null,
      enabled: values.enabled,
      position: values.position ?? null,
    };

 const { error } = await (supabase as any)
  .from("offers")
  .upsert(payload, { onConflict: "slug" });

    if (error) {
      alert("Save error: " + error.message);
      return;
    }
    alert("Saved!");
    // reset(payload); // если нужно сбросить форму к сохранённым значениям
  };

  return (
    <Section className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Offer</h1>

      <Card className="p-6 space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* slug */}
          <div>
            <label className="block text-sm mb-1">Slug*</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="my-casino"
              {...register("slug")}
            />
            {errors.slug && (
              <p className="mt-1 text-sm text-red-500">{errors.slug.message}</p>
            )}
          </div>
          {editing && (
            <div className="pt-2">
              <Button
                type="button"
                variant="soft"
                onClick={async () => {
                  if (!routeSlug) return;
                  if (!confirm("Delete this offer?")) return;
                  const s = decodeURIComponent(routeSlug);
                  const { error } = await (supabase as any)
                    .from("offers")
                    .delete()
                    .eq("slug", s);
                  if (error) { alert("Delete error: " + error.message); return; }
                  alert("Deleted");
                  nav("/admin/offers");
                }}
              >
                Delete
              </Button>
            </div>
          )}

          {/* name */}
          <div>
            <label className="block text-sm mb-1">Name*</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Casino Name"
              {...register("name")}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* license */}
          <div>
            <label className="block text-sm mb-1">License*</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              {...register("license")}
            >
              <option value="MGA">MGA</option>
              <option value="UKGC">UKGC</option>
              <option value="Curaçao">Curaçao</option>
              <option value="Other">Other</option>
            </select>
            {errors.license && (
              <p className="mt-1 text-sm text-red-500">
                {errors.license.message as string}
              </p>
            )}
          </div>

          {/* rating */}
          <div>
            <label className="block text-sm mb-1">Rating (0–5)*</label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={5}
              className="w-full rounded-md border px-3 py-2"
              {...register("rating", { valueAsNumber: true })}
            />
            {errors.rating && (
              <p className="mt-1 text-sm text-red-500">
                {errors.rating.message as string}
              </p>
            )}
          </div>

          {/* payout */}
          <div>
            <label className="block text-sm mb-1">Payout</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="e.g. Instant / 1-24h"
              {...register("payout")}
            />
            {errors.payout && (
              <p className="mt-1 text-sm text-red-500">{errors.payout.message}</p>
            )}
          </div>

          {/* payout_hours */}
          <div>
            <label className="block text-sm mb-1">Payout hours (optional)</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border px-3 py-2"
              {...register("payout_hours", { valueAsNumber: true })}
            />
            {errors.payout_hours && (
              <p className="mt-1 text-sm text-red-500">
                {errors.payout_hours.message as string}
              </p>
            )}
          </div>

          {/* methods_csv */}
          <div>
            <label className="block text-sm mb-1">Methods (CSV)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="visa, mastercard, skrill"
              {...register("methods_csv")}
            />
          </div>

          {/* link */}
          <div>
            <label className="block text-sm mb-1">Link</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="https://… or /go/slug"
              {...register("link")}
            />
            {errors.link && (
              <p className="mt-1 text-sm text-red-500">
                {errors.link.message as string}
              </p>
            )}
          </div>

          {/* position */}
          <div>
            <label className="block text-sm mb-1">Position (optional)</label>
            <input
              type="number"
              className="w-full rounded-md border px-3 py-2"
              {...register("position", { valueAsNumber: true })}
            />
            {errors.position && (
              <p className="mt-1 text-sm text-red-500">
                {errors.position.message as string}
              </p>
            )}
          </div>

          {/* enabled */}
          <div className="flex items-center gap-2">
            <input id="enabled" type="checkbox" {...register("enabled")} />
            <label htmlFor="enabled" className="text-sm">
              Enabled
            </label>
          </div>

          <div className="pt-2 flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset(defaultValues)}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </Section>
  );
}


