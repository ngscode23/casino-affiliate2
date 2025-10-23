
"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import { UploadCloud, Trash2, Star, Link as LinkIcon, Loader2 } from "lucide-react";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { toast } from "@ui/components/common/toast";
import { normalizeSku } from "@shared/lib/normalize";
import { getValidAccessToken } from "@shared/lib/auth";

interface ProductImagesFieldProps {
  label?: string;
  images: string[];
  onChange: (next: string[]) => void;
  slug?: string | null;
  productId?: string | null;
  sku?: string | null;
  onVersionCreated?: (payload: { id: string; publicUrl: string }) => void;
}

async function recordImageVersion(params: {
  productId: string;
  sku: string;
  path: string;
  sourceUrl: string;
  accessToken?: string | null;
  onVersionCreated?: (payload: { id: string; publicUrl: string }) => void;
}) {
  try {
    const response = await fetch("/api/admin-product-images", {
      method: "POST",
      headers: Object.fromEntries(
        Object.entries({
          "content-type": "application/json",
          Authorization: params.accessToken ? `Bearer ${params.accessToken}` : undefined,
        }).filter(([, v]) => v != null)
      ) as HeadersInit,
      body: JSON.stringify({
        op: "record",
        productId: params.productId,
        sku: params.sku,
        path: params.path,
        sourceUrl: params.sourceUrl,
      }),
    });
    if (!response.ok) return;
    const json = await response.json();
    const versionId = json?.version?.id as string | undefined;
    const versionUrl = json?.version?.publicUrl as string | undefined;
    if (versionId && versionUrl && params.onVersionCreated) {
      params.onVersionCreated({ id: versionId, publicUrl: versionUrl });
    }
  } catch (error) {
    console.warn("record image version failed", error);
  }
}

export function ProductImagesField({
  label = "Images",
  images,
  onChange,
  slug,
  productId,
  sku,
  onVersionCreated,
}: ProductImagesFieldProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    if (!productId) {
      setError("Save the product before uploading images.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    const file = fileList[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const accessToken = await getValidAccessToken().catch(() => null);

      const normalizedSku = normalizeSku(sku ?? undefined, slug ?? productId ?? undefined);
      if (!normalizedSku) throw new Error("Cannot derive SKU for upload");

      const ext = file.name.split(".").pop() ?? "webp";
      const uploadResponse = await fetch("/api/admin-get-upload-url", {
        method: "POST",
        headers: Object.fromEntries(
          Object.entries({
            "content-type": "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
          }).filter(([, v]) => v != null)
        ) as HeadersInit,
        body: JSON.stringify({
          productId,
          sku: normalizedSku,
          slug: slug || null,
          ext,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error(await uploadResponse.text());
      }

      const uploadJson = await uploadResponse.json();
      const uploadUrl = uploadJson?.uploadUrl as string | undefined;
      const publicUrl = uploadJson?.publicUrl as string | undefined;
      const storagePath = uploadJson?.path as string | undefined;
      const uploadToken = uploadJson?.token as string | undefined;

      if (!uploadUrl || !publicUrl || !storagePath || !uploadToken) {
        throw new Error("Upload URL response missing fields");
      }

      const putResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": file.type || "application/octet-stream",
          Authorization: `Bearer ${uploadToken}`,
          "x-upsert": "true",
          "cache-control": "no-cache",
        },
        body: file,
      });
      if (!putResponse.ok) {
        throw new Error(`Upload failed: ${putResponse.status}`);
      }

      const nextImages = [publicUrl, ...images.filter((url) => url !== publicUrl)];
      onChange(nextImages);

      await recordImageVersion({
        productId,
        sku: normalizedSku,
        path: storagePath,
        sourceUrl: publicUrl,
        accessToken,
        onVersionCreated,
      });

      toast("Image uploaded", { variant: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, idx) => idx !== index));
  };

  const promoteImage = (index: number) => {
    if (index <= 0) return;
    const next = [...images];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    onChange(next);
  };

  const addManualImage = () => {
    const url = manualUrl.trim();
    if (!url) return;
    onChange([url, ...images.filter((item) => item !== url)]);
    setManualUrl("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">{label}</label>
        {uploading && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Uploading...
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div key={`${url}-${index}`} className="relative h-28 w-28 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <Image
              src={url || "/og.svg"}
              alt={`Product ${index + 1}`}
              fill
              sizes="112px"
              className="object-cover"
              onError={(event) => {
                event.currentTarget.src = "/og.svg";
              }}
              unoptimized
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-2 py-1 text-[11px] text-white">
              <button
                type="button"
                className="inline-flex items-center gap-1"
                onClick={() => promoteImage(index)}
                disabled={index === 0}
              >
                <Star className={`h-3 w-3 ${index === 0 ? "text-yellow-300" : "text-white/80"}`} />
                {index === 0 ? "Primary" : "Promote"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1"
                onClick={() => removeImage(index)}
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background text-xs text-muted-foreground transition hover:border-border/80"
          disabled={uploading || !productId}
        >
          <UploadCloud className="h-6 w-6" />
          Upload
        </button>
      </div>

      <input
        ref={fileInput}
        className="hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => handleFiles(event.currentTarget.files)}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="url"
          placeholder="https://example.com/image.jpg"
          value={manualUrl}
          onChange={(event) => setManualUrl(event.currentTarget.value)}
        />
        <Button type="button" variant="secondary" onClick={addManualImage} disabled={!manualUrl.trim()} className="sm:w-auto">
          <LinkIcon className="mr-2 h-4 w-4" />Add by URL
        </Button>
      </div>

      {error ? <div className="text-sm text-rose-500">{error}</div> : null}
      <p className="text-xs text-muted-foreground">
        Images are stored in Supabase Storage. The first image is treated as the primary preview.
      </p>
    </div>
  );
}
