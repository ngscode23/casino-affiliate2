
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";


import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";
import { getValidAccessToken } from "@shared/lib/auth";

export interface ImageVersion {
  id: string;
  path: string;
  publicUrl: string;
  uploadedAt: string;
  uploadedBy?: string | null;
  isCurrent: boolean;
  sourceUrl?: string | null;
}

interface ProductImageHistoryProps {
  productId: string;
  refreshToken: number;
  onUseImage: (url: string) => void;
}

export function ProductImageHistory({ productId, refreshToken, onUseImage }: ProductImageHistoryProps) {
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const accessToken = await getValidAccessToken().catch(() => null);
        const response = await fetch(`/api/admin-product-images?productId=${encodeURIComponent(productId)}`, {
          headers: Object.fromEntries(
            Object.entries({
              accept: "application/json",
              Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
            }).filter(([, v]) => v != null)
          ) as HeadersInit,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const json = await response.json();
        if (!cancelled && Array.isArray(json?.versions)) {
          setVersions(json.versions as ImageVersion[]);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("product image history fetch failed", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, refreshToken]);

  const makeCurrent = async (versionId: string) => {
    try {
      const accessToken = await getValidAccessToken().catch(() => null);
      const response = await fetch("/api/admin-product-images", {
        method: "POST",
        headers: Object.fromEntries(
          Object.entries({
            "content-type": "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
          }).filter(([, v]) => v != null)
        ) as HeadersInit,
        body: JSON.stringify({
          op: "revert",
          productId,
          versionId,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const json = await response.json();
      const current = json?.current as ImageVersion | undefined;
      if (current?.publicUrl) {
        onUseImage(current.publicUrl);
        setVersions((prev) => prev.map((item) => ({ ...item, isCurrent: item.id === current.id })));
        toast("Primary image updated", { variant: "success" });
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), { variant: "error" });
    }
  };

  if (!productId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Image history</h3>
        {loading ? <span className="text-xs text-muted-foreground">Loading...</span> : null}
      </div>
      {versions.length === 0 ? (
        <div className="text-xs text-muted-foreground">No previous versions yet.</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`rounded-lg border p-2 text-xs ${version.isCurrent ? "border-primary" : "border-border"}`}
            >
              <div className="relative aspect-square overflow-hidden rounded">
                <Image
                  src={version.publicUrl || "/og.svg"}
                  alt="Version history preview"
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 200px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">{new Date(version.uploadedAt).toLocaleString()}</span>
                <Button
                  type="button"
                  variant={version.isCurrent ? "soft" : "secondary"}
                  disabled={version.isCurrent}
                  onClick={() => makeCurrent(version.id)}
                >
                  {version.isCurrent ? "Current" : "Use as primary"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
