
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";
import { supabase } from "@shared/lib/supabase";
import { getValidAccessToken } from "@shared/lib/auth";
import { adminFetch } from "@shared/lib/api";
import { normalizeSku, slugifyTitle } from "@shared/lib/normalize";

import { ProductImagesField } from "./product-images-field";
import { ProductImageHistory } from "./product-image-history";

interface Category {
  slug: string;
  name: string;
}

interface EditorProps {
  productId?: string | null;
}

function generateSku() {
  const base = "SKU";
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase();
  return `${base}-${stamp}-${random}`;
}

function snapshotState(state: {
  title: string;
  slug: string;
  sku: string;
  price: string;
  category: string | null;
  status: string;
  rating: string;
  shortDesc: string;
  tags: string;
  images: string[];
  specs: Record<string, unknown>;
}) {
  return JSON.stringify({
    ...state,
    images: [...state.images],
  });
}

export function ProductEditorClient({ productId }: EditorProps) {
  const router = useRouter();
  const [currentId, setCurrentId] = useState<string | null>(productId ?? null);

  const isNew = !currentId;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [rating, setRating] = useState("0");
  const [shortDesc, setShortDesc] = useState("");
  const [sku, setSku] = useState("");
  const [tags, setTags] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [specsJson, setSpecsJson] = useState("{}");
  const [specsError, setSpecsError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [originalSnapshot, setOriginalSnapshot] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setCurrentId(productId ?? null);
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: catData, error: catError } = await supabase
          .from("ecom_categories")
          .select("slug,name")
          .order("name");
        if (catError) throw catError;
        if (!cancelled && Array.isArray(catData)) {
          setCategories(catData as Category[]);
        }

        if (!currentId) {
          setLoading(false);
          return;
        }

        const { data, error: productError } = await supabase
          .from("ecom_products")
          .select(
            "id,slug,sku,title,price,rating,images,short_desc,category_slug,status,tags,specs"
          )
          .eq("id", currentId)
          .maybeSingle();

        if (productError) throw productError;
        if (data && !cancelled) {
          setTitle(data.title ?? "");
          setSlug(data.slug ?? "");
          setSku(data.sku ?? "");
          setPrice(data.price != null ? String(data.price) : "0");
          setCategory(data.category_slug ?? null);
          setStatus((data.status as string | null) ?? "draft");
          setRating(data.rating != null ? String(data.rating) : "0");
          setShortDesc(data.short_desc ?? "");
          setTags(Array.isArray(data.tags) ? (data.tags as string[]).join(", ") : "");
          setImages(Array.isArray(data.images) ? (data.images as string[]) : []);
          setSpecsJson(JSON.stringify(data.specs ?? {}, null, 2));

          const snapshot = snapshotState({
            title: data.title ?? "",
            slug: data.slug ?? "",
            sku: data.sku ?? "",
            price: data.price != null ? String(data.price) : "0",
            category: data.category_slug ?? null,
            status: (data.status as string | null) ?? "draft",
            rating: data.rating != null ? String(data.rating) : "0",
            shortDesc: data.short_desc ?? "",
            tags: Array.isArray(data.tags) ? (data.tags as string[]).join(", ") : "",
            images: Array.isArray(data.images) ? (data.images as string[]) : [],
            specs: data.specs ?? {},
          });
          setOriginalSnapshot(snapshot);
          setIsDirty(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentId]);

  useEffect(() => {
    if (!isNew) return;
    if (!title) return;
    setSlug((prev) => (prev ? prev : slugifyTitle(title, sku)));
    setSku((prev) => (prev ? prev : normalizeSku(undefined, title)));
  }, [title, sku, isNew]);

  useEffect(() => {
    let specsObject: Record<string, unknown> = {};
    try {
      specsObject = JSON.parse(specsJson || "{}");
      setSpecsError(null);
    } catch {
      specsObject = {};
    }

    const snapshot = snapshotState({
      title,
      slug,
      sku,
      price,
      category,
      status,
      rating,
      shortDesc,
      tags,
      images,
      specs: specsObject,
    });
    setIsDirty(originalSnapshot !== null && snapshot !== originalSnapshot);
  }, [title, slug, sku, price, category, status, rating, shortDesc, tags, images, specsJson, originalSnapshot]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  const categoryOptions = useMemo(() => {
    return [{ slug: "", name: "-" }, ...categories];
  }, [categories]);

  const handleUseImage = useCallback((url: string) => {
    setImages((prev) => [url, ...prev.filter((item) => item !== url)]);
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSpecsError(null);

      const normalizedSku = normalizeSku(sku, title);
      const normalizedSlug = slugifyTitle(slug || title, normalizedSku);
      const priceValue = parseFloat(price.replace(",", "."));
      if (!Number.isFinite(priceValue)) {
        throw new Error("Price must be a valid number");
      }
      const ratingValue = parseFloat(rating.replace(",", "."));

      let specsData: Record<string, unknown> = {};
      try {
        specsData = specsJson.trim() ? (JSON.parse(specsJson) as Record<string, unknown>) : {};
      } catch (specError) {
        setSpecsError("Specs must be valid JSON");
        throw specError;
      }

      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        id: currentId ?? undefined,
        title: title.trim(),
        slug: normalizedSlug,
        sku: normalizedSku,
        price: priceValue,
        rating: Number.isFinite(ratingValue) ? ratingValue : null,
        category_slug: category || null,
        status,
        short_desc: shortDesc.trim(),
        tags: tagsArray,
        images,
        specs: specsData,
      };

      const accessToken = await getValidAccessToken().catch(() => null);

      const headers = new Headers({
        "content-type": "application/json",
      });
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

      const response = await adminFetch("/api/admin-products", {
        method: "POST",
        headers,
        body: JSON.stringify({ op: "upsert", product: payload }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const json = await response.json();
      if (json?.ok === false) {
        throw new Error(String(json?.message || json?.error || "Failed to save product"));
      }

      const nextId = (json?.id as string | undefined) ?? currentId;
      toast("Saved", { variant: "success" });

      const snapshot = snapshotState({
        title: payload.title as string,
        slug: normalizedSlug,
        sku: normalizedSku,
        price: String(priceValue),
        category: category || null,
        status,
        rating: Number.isFinite(ratingValue) ? String(ratingValue) : "0",
        shortDesc: payload.short_desc as string,
        tags: tagsArray.join(", "),
        images,
        specs: specsData,
      });
      setOriginalSnapshot(snapshot);
      setIsDirty(false);

      if (!currentId && nextId) {
        setCurrentId(nextId);
        setHistoryRefresh((value) => value + 1);
        router.replace(`/admin/shop/products/${nextId}`);
      } else if (currentId) {
        setHistoryRefresh((value) => value + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Section className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[320px] w-full" />
      </Section>
    );
  }

  return (
    <Section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {currentId ? "Edit product" : "Create product"}
        </h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Status: {isDirty ? "Unsaved changes" : "Saved"}</span>
        </div>
      </div>

      <Card className="p-6">
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(event) => setTitle(event.currentTarget.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input value={slug} onChange={(event) => setSlug(event.currentTarget.value)} required />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Price</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(event) => setPrice(event.currentTarget.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rating</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={rating}
                onChange={(event) => setRating(event.currentTarget.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">SKU</label>
              <div className="flex gap-2">
                <Input value={sku} onChange={(event) => setSku(event.currentTarget.value)} required />
                <Button type="button" variant="ghost" onClick={() => setSku(generateSku())}>
                  Regenerate
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={category ?? ""}
                onChange={(event) => setCategory(event.currentTarget.value || null)}
              >
                {categoryOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.currentTarget.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Short description</label>
            <textarea
              value={shortDesc}
              onChange={(event) => setShortDesc(event.currentTarget.value)}
              rows={3}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tags (comma separated)</label>
            <Input value={tags} onChange={(event) => setTags(event.currentTarget.value)} />
          </div>

          <ProductImagesField
            label="Images"
            images={images}
            onChange={setImages}
            productId={currentId}
            slug={slug}
            sku={sku}
            onVersionCreated={() => setHistoryRefresh((value) => value + 1)}
          />

          {currentId ? (
            <ProductImageHistory
              productId={currentId}
              refreshToken={historyRefresh}
              onUseImage={handleUseImage}
            />
          ) : null}

          <div>
            <label className="text-sm font-medium">Specifications (JSON object)</label>
            <textarea
              value={specsJson}
              onChange={(event) => setSpecsJson(event.currentTarget.value)}
              rows={6}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
            />
            {specsError ? <p className="mt-1 text-xs text-rose-500">{specsError}</p> : null}
          </div>

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/shop/products")}>Back to list</Button>
          </div>
        </form>
      </Card>
    </Section>
  );
}
