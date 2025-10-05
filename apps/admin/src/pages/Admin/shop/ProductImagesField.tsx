import { useRef, useState } from "react";
import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";
import { supabase } from "@shared/lib/supabase";
import { normalizeSku } from "@shared/lib/normalize";
import { UploadCloud, Trash2, Star, Link as LinkIcon, Loader2 } from "lucide-react";
import { API_BASE, API_FALLBACK_BASE } from "@shared/ecom/api/client";

type Props = {
  label?: string;
  images: string[];
  onChange: (next: string[]) => void;
  slug?: string;
  productId?: string | null;
  sku?: string | null;
  onVersionCreated?: (payload: { id: string; publicUrl: string }) => void;
};

const API_BASES = [API_BASE, API_FALLBACK_BASE] as const;

async function requestWithFallback(path: string, init: RequestInit) {
  let lastResponse: Response | null = null;
  for (let i = 0; i < API_BASES.length; i += 1) {
    const base = API_BASES[i];
    const response = await fetch(`${base}${path}`, init);
    lastResponse = response;
    if (response.status === 404 && i < API_BASES.length - 1) {
      continue;
    }
    return response;
  }
  if (lastResponse) return lastResponse;
  throw new Error("Upload API unavailable");
}

export default function ProductImagesField({
  label = "Images",
  images,
  onChange,
  slug,
  productId,
  sku,
  onVersionCreated,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(list: FileList | null) {
    if (!list || !list.length) return;
    if (!productId) {
      setError("Сначала сохраните товар, чтобы появилась возможность загрузки изображения.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const files = Array.from(list);
    const file = files[0];
    if (!file) return;

    const remaining = files.length > 1;
    setError(remaining ? "Загружается только первое фото. Повторите для остальных." : null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "";
      const candidateSku = normalizeSku(sku ?? undefined, slug ?? productId ?? undefined);
      if (!candidateSku) throw new Error("Сохраните товар и убедитесь, что у него есть идентификатор, прежде чем загружать изображение.");

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) throw new Error("Нет доступа. Перезайдите в админку.");

      const response = await requestWithFallback("/admin-get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ productId, sku: candidateSku, slug: slug?.trim?.() || null, ext }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Не удалось получить URL загрузки");
      }

      const { uploadUrl, publicUrl, path } = await response.json();
      if (!uploadUrl || !publicUrl) throw new Error("Ответ функции не содержит URL загрузки");

      const put = await fetch(uploadUrl as string, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

      const next = [publicUrl as string, ...images.filter((url) => url !== publicUrl)];
      onChange(next);

      try {
        const recordRes = await requestWithFallback("/admin-product-images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            op: "record",
            productId,
            sku: candidateSku,
            path,
            sourceUrl: publicUrl,
          }),
        });
        if (recordRes.ok) {
          const recordJson = await recordRes.json();
          const versionId = recordJson?.version?.id as string | undefined;
          const versionUrl = recordJson?.version?.publicUrl as string | undefined;
          if (versionId && versionUrl && onVersionCreated) {
            onVersionCreated({ id: versionId, publicUrl: versionUrl });
          }
        } else {
          const msg = await recordRes.text();
          console.warn("Failed to record image version", msg);
        }
      } catch (recordErr) {
        console.warn("record image version error", recordErr);
      }

      toast("Изображение загружено", { variant: "success" });
    } catch (e: any) {
      const msg = e?.message || "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
  }

  function promoteImage(index: number) {
    if (index <= 0) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
  }

  function addManualImage() {
    const url = manualUrl.trim();
    if (!url) return;
    onChange([...images, url]);
    setManualUrl("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="block text-sm font-medium text-text">{label}</label>
        {uploading && (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Загрузка...
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div key={`${url}-${index}`} className="relative overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-white/10">
            <img
              src={url}
              alt={`Product ${index + 1}`}
              className="h-28 w-28 object-cover"
              onError={(event) => {
                const img = event.currentTarget;
                img.style.objectFit = "contain";
                img.src = "/og.svg";
              }}
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-2 py-1 text-[11px] text-white">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide"
                onClick={() => promoteImage(index)}
                disabled={index === 0}
                title={index === 0 ? "Уже основное" : "Сделать основным"}
              >
                <Star className={`h-3 w-3 ${index === 0 ? "text-yellow-300" : "text-white/80"}`} />
                {index === 0 ? "Основное" : "Главное"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide"
                onClick={() => removeImage(index)}
                title="Удалить"
              >
                <Trash2 className="h-3 w-3" />
                Удалить
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white text-xs text-muted transition hover:border-slate-400 hover:text-text dark:bg-white/5"
          disabled={uploading || !productId}
        >
          <UploadCloud className="h-6 w-6" />
          Загрузить
        </button>
      </div>

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => handleFiles(event.currentTarget.files)}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            type="url"
            placeholder="https://..."
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={manualUrl}
            onChange={(event) => setManualUrl(event.currentTarget.value)}
          />
        </div>
        <Button type="button" variant="secondary" onClick={addManualImage} disabled={!manualUrl.trim()} className="sm:w-auto">
          <LinkIcon className="mr-2 h-4 w-4" />
          Добавить по ссылке
        </Button>
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}
      <p className="text-xs text-muted">
        Файл загружается напрямую в Supabase Storage через одноразовый URL. Сохраните карточку товара, чтобы появились идентификатор и slug — только после этого станет доступна загрузка. Первое изображение показывается на витрине.
      </p>
    </div>
  );
}

