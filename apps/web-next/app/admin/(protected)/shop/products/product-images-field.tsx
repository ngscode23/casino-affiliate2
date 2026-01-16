"use client";
import { mutedTextXs } from "@/styles/classnames";

import { useRef, useState } from "react";
import Image from "next/image";

import { UploadCloud, Trash2, Star, Link as LinkIcon, Loader2, MoveVertical } from "lucide-react";

import Button from "@ui/components/common/button";
import Input from "@ui/components/common/input";
import { toast } from "@ui/components/common/toast";
import { normalizeSku } from "@shared/lib/normalize";
import { getValidAccessToken } from "@shared/lib/auth";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const SUPPORTED_IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function isSupportedImage(file: File): boolean {
  if (file.type) {
    return SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase());
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ext) return true;
  return SUPPORTED_IMAGE_EXTS.has(ext);
}

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
    const response = await fetch("/api/admin/shop/products/images", {
      method: "POST",
      headers: Object.fromEntries(
        Object.entries({
          "content-type": "application/json",
          Authorization: params.accessToken ? `Bearer ${params.accessToken}` : undefined,
        }).filter(([, v]) => v != null),
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
  const dragIndex = useRef<number | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenKeys, setBrokenKeys] = useState<Record<string, boolean>>({});
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadSingleFile = async (file: File) => {
    if (!isSupportedImage(file)) {
      throw new Error("Unsupported image type. Use JPG, PNG, WEBP, or GIF.");
    }
    const accessToken = await getValidAccessToken().catch(() => null);
    const normalizedSku = normalizeSku(sku ?? undefined, slug ?? productId ?? undefined);
    if (!normalizedSku) throw new Error("Нужно сохранить SKU/slug, чтобы загрузить изображение");
    const ext = file.name.split(".").pop() ?? "webp";

    const uploadResponse = await fetch("/api/admin/shop/products/upload-url", {
      method: "POST",
      headers: Object.fromEntries(
        Object.entries({
          "content-type": "application/json",
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        }).filter(([, v]) => v != null),
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

    const buildUploadBody = () => {
      if (typeof FormData !== "undefined" && file instanceof Blob) {
        const form = new FormData();
        form.append("cacheControl", "3600");
        // Supabase storage expects an unnamed file field for signed uploads.
        form.append("", file);
        return { body: form, contentType: null as string | null };
      }
      return { body: file, contentType: file.type || "application/octet-stream" };
    };

    const { body, contentType } = buildUploadBody();

    const putOnce = async (withAuth: boolean) =>
      fetch(uploadUrl, {
        method: "PUT",
        headers: Object.fromEntries(
          Object.entries({
            ...(contentType ? { "content-type": contentType } : null),
            "x-upsert": "true",
            Authorization: withAuth ? `Bearer ${uploadToken}` : undefined,
          }).filter(([, v]) => v != null),
        ) as HeadersInit,
        body,
      });

    let putResponse = await putOnce(false);
    if (!putResponse.ok) {
      putResponse = await putOnce(true);
    }
    if (!putResponse.ok) {
      const text = await putResponse.text().catch(() => "");
      throw new Error(`Upload failed: ${putResponse.status} ${text || ""}`.trim());
    }

    const nextImages = [publicUrl, ...images.filter((url) => url !== publicUrl)];
    onChange(nextImages);

    if (productId) {
      await recordImageVersion({
        productId,
        sku: normalizedSku,
        path: storagePath,
        sourceUrl: publicUrl,
        accessToken,
        onVersionCreated,
      });
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    if (!productId && !slug && !sku) {
      setError("Сначала сохраните SKU (нужен slug/SKU), после чего станет доступна загрузка.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const files = Array.from(fileList);
      for (const file of files) {
        // sequential upload to preserve order
        await uploadSingleFile(file);
      }
      toast("Изображения загружены", { variant: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
      setIsDragOver(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, idx) => idx !== index));
  };

  const moveImage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) return;
    const next = [...images];
    const [selected] = next.splice(from, 1);
    next.splice(to, 0, selected);
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
      <div
        className={`flex flex-wrap gap-3 rounded-xl border border-dashed ${
          isDragOver ? "border-indigo-400 bg-indigo-50/60" : "border-border"
        } p-2 transition`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {images.map((url, index) => {
          const key = `${url ?? "empty"}-${index}`;
          const isBroken = !url || brokenKeys[key];
          return (
            <div
              key={key}
              className="relative h-28 w-28 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              draggable
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const from = dragIndex.current;
                dragIndex.current = null;
                if (from == null) return;
                moveImage(from, index);
              }}
            >
              {isBroken ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground">
                  <span>Нет фото</span>
                  <span className="text-[10px]">Проверьте источник</span>
                </div>
              ) : (
                <Image
                  src={url}
                  alt={`Product ${index + 1}`}
                  fill
                  sizes="112px"
                  className="object-cover"
                  onError={() =>
                    setBrokenKeys((prev) => {
                      if (prev[key]) return prev;
                      return { ...prev, [key]: true };
                    })
                  }
                  unoptimized
                />
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-2 py-1 text-[11px] text-white">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => moveImage(index, 0)}
                  disabled={index === 0}
                >
                  <Star className={`h-3 w-3 ${index === 0 ? "text-yellow-300" : "text-white/80"}`} />
                  {index === 0 ? "Primary" : "Promote"}
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => moveImage(index, Math.max(0, index - 1))} disabled={index === 0}>
                    <MoveVertical className="h-3 w-3 rotate-180" />
                  </button>
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => moveImage(index, Math.min(images.length - 1, index + 1))} disabled={index === images.length - 1}>
                    <MoveVertical className="h-3 w-3" />
                  </button>
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => removeImage(index)}>
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background text-xs text-muted-foreground transition hover:border-border/80"
          disabled={uploading || (!productId && !slug && !sku)}
        >
          <UploadCloud className="h-6 w-6" />
          Upload
        </button>
      </div>
      <input
        ref={fileInput}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
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
          <LinkIcon className="mr-2 h-4 w-4" />
          Add by URL
        </Button>
      </div>
      {error ? <div className="text-sm text-rose-500">{error}</div> : null}
      {!productId ? (
        <p className={mutedTextXs}>
          После первого сохранения товара появится история версий и продвинутое управление изображениями.
        </p>
      ) : null}
      <p className={mutedTextXs}>Images are stored in Supabase Storage. Drag & drop несколько файлов, перетаскивайте карточки для изменения порядка. Первая картинка — основная.</p>
    </div>
  );
}
