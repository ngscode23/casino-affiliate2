import { useRef, useState } from "react";
import Button from "@/components/common/button";
import { supabase } from "@/lib/supabase";
import { SUPABASE_PRODUCT_IMAGES_BUCKET } from "@/config";
import { UploadCloud, Trash2, Star, Link as LinkIcon, Loader2 } from "lucide-react";

function safeSegment(value: string): string {
  const base = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "product";
}

function uniqueName(fileName: string, slug: string): string {
  const extensionMatch = fileName.split(".").pop();
  const ext = extensionMatch ? extensionMatch.toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
  const base = slug ? safeSegment(slug) : "product";
  const rand = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now();
  return `${base}/${timestamp}-${rand}.${ext || "jpg"}`;
}

type Props = {
  label?: string;
  images: string[];
  onChange: (next: string[]) => void;
  slug?: string;
};

export default function ProductImagesField({ label = "Images", images, onChange, slug }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bucket = SUPABASE_PRODUCT_IMAGES_BUCKET;

  async function handleFiles(list: FileList | null) {
    if (!list || !list.length) return;
    setError(null);
    setUploading(true);
    try {
      const client = supabase.storage.from(bucket);
      const files = Array.from(list);
      const urls: string[] = [];
      for (const file of files) {
        const path = uniqueName(file.name, slug || "");
        const upload = await client.upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upload.error) throw upload.error;
        const { data } = client.getPublicUrl(path);
        if (!data?.publicUrl) throw new Error("Failed to resolve public URL");
        urls.push(data.publicUrl);
      }
      if (urls.length) onChange([...images, ...urls]);
    } catch (e: any) {
      const msg = e?.message || "Upload failed";
      setError(msg.includes("duplicate") ? "Файл с таким именем уже существует. Попробуйте снова." : msg);
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
          disabled={uploading}
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
        Первое изображение отображается на витрине. Сделайте нужное фото основным или удалите лишние. Бакет Supabase должен быть публичным для прямого доступа.
      </p>
    </div>
  );
}
