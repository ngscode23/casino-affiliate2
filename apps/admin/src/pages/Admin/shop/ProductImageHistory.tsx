import { useEffect, useState } from "react";
import Button from "@ui/components/common/button";
import { getValidAccessToken } from "@shared/lib/auth";
import { toast } from "@ui/components/common/toast";

export type ImageVersion = {
  id: string;
  path: string;
  publicUrl: string;
  uploadedAt: string;
  uploadedBy?: string | null;
  isCurrent: boolean;
  sourceUrl?: string | null;
};

type Props = {
  productId: string;
  refreshToken: number;
  onUseImage: (url: string) => void;
};

export default function ProductImageHistory({ productId, refreshToken, onUseImage }: Props) {
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const accessToken = await getValidAccessToken();
        if (!accessToken) throw new Error("Нет доступа");
        const res = await fetch(`/.netlify/functions/admin-product-images?productId=${encodeURIComponent(productId)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!cancelled) {
          setVersions(Array.isArray(json?.versions) ? json.versions : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("history fetch failed", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, refreshToken]);

  async function makeCurrent(versionId: string) {
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error("Нет доступа");
      const res = await fetch("/.netlify/functions/admin-product-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ op: "revert", productId, versionId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const current = json?.current as ImageVersion | undefined;
      if (current?.publicUrl) {
        onUseImage(current.publicUrl);
        toast("Сделано основным", { variant: "success" });
        setVersions((prev) =>
          prev.map((item) => ({
            ...item,
            isCurrent: item.id === current.id,
          })),
        );
      }
    } catch (err: any) {
      toast(err?.message || "Не удалось применить изображение", { variant: "error" });
    }
  }

  if (!productId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">История изображений</h3>
        {loading && <span className="text-xs text-muted">Загрузка...</span>}
      </div>
      {versions.length === 0 ? (
        <div className="text-xs text-muted">Версии пока отсутствуют.</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`rounded-lg border p-2 text-xs space-y-2 ${version.isCurrent ? "border-[rgb(var(--primary))]" : "border-border"}`}
            >
              <div className="aspect-square overflow-hidden rounded">
                <img src={version.publicUrl} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted">{new Date(version.uploadedAt).toLocaleString()}</span>
                <Button
                  type="button"
                  variant={version.isCurrent ? "soft" : "secondary"}
                  disabled={version.isCurrent}
                  onClick={() => makeCurrent(version.id)}
                >
                  {version.isCurrent ? "Текущее" : "Сделать основным"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

