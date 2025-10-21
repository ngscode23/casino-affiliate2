"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { cn } from "@shared/lib/cn";

type ProductGalleryLightboxComponent = typeof import("./ProductGalleryLightbox").default;

type ProductGalleryProps = {
  title: string;
  images: string[];
  fallbackImage: string;
  activeImage?: string | null;
  onActiveChangeAction?: (nextUrl: string, index: number) => void;
};

const ZOOM_SCALE = 1.1;

export default function ProductGallery({
  title,
  images,
  fallbackImage,
  activeImage,
  onActiveChangeAction,
}: ProductGalleryProps) {
  const list = useMemo(() => {
    const normalized = Array.isArray(images) ? images.filter(Boolean) : [];
    if (!normalized.length && fallbackImage) return [fallbackImage];
    if (fallbackImage && !normalized.includes(fallbackImage)) {
      return [...normalized, fallbackImage];
    }
    return normalized.length ? normalized : [fallbackImage];
  }, [images, fallbackImage]);

  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!activeImage) return;
    const nextIndex = list.indexOf(activeImage);
    if (nextIndex >= 0 && nextIndex !== index) {
      setIndex(nextIndex);
    }
  }, [activeImage, list, index]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [Lightbox, setLightbox] = useState<ProductGalleryLightboxComponent | null>(null);
  const [transformOrigin, setTransformOrigin] = useState("center center");

  const current = list[index] ?? fallbackImage;

  const updateIndex = useCallback(
    (next: number) => {
      const normalized = (next + list.length) % list.length;
      setIndex(normalized);
      onActiveChangeAction?.(list[normalized], normalized);
    },
    [list, onActiveChangeAction],
  );

  const handlePrev = useCallback(() => {
    updateIndex(index - 1);
  }, [index, updateIndex]);

  const handleNext = useCallback(() => {
    updateIndex(index + 1);
  }, [index, updateIndex]);

  useEffect(() => {
    if (!lightboxOpen || list.length <= 1) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        updateIndex(index - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        updateIndex(index + 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, index, list.length, updateIndex]);

  const onMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setTransformOrigin(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }, []);

  const onMouseLeave = useCallback(() => {
    setTransformOrigin("center center");
  }, []);

  const openLightbox = useCallback(async () => {
    if (!Lightbox) {
      const mod = await import("./ProductGalleryLightbox");
      setLightbox(() => mod.default);
    }
    setLightboxOpen(true);
  }, [Lightbox]);

  return (
    <div className="space-y-4">
      <div
        className="group relative aspect-square overflow-hidden rounded-2xl border border-border/40 bg-[var(--surface-1)]"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {current ? (
          <Image
            key={current}
            src={current}
            alt={title}
            fill
            priority={index === 0}
            quality={70}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 560px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            style={{ transformOrigin }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">
            Изображение отсутствует
          </div>
        )}
        {list.length > 1 ? (
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white shadow-lg transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            onClick={openLightbox}
            aria-label="Открыть в предпросмотре"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {list.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {list.map((image, idx) => (
            <button
              key={image ?? idx}
              type="button"
              onClick={() => updateIndex(idx)}
              className={cn(
                "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                idx === index ? "border-primary shadow-lg" : "border-border/40 hover:border-border/70",
              )}
              aria-label={`Просмотреть изображение ${idx + 1}`}
            >
              {image ? (
                <Image
                  src={image}
                  alt="Миниатюра"
                  fill
                  quality={60}
                  sizes="80px"
                  loading="lazy"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] text-muted">
                  нет фото
                </div>
              )}
            </button>
          ))}
        </div>
      ) : null}

      {Lightbox ? (
        <Lightbox
          title={title}
          open={lightboxOpen}
          onOpenChangeAction={setLightboxOpen}
          images={list}
          index={index}
          current={current}
          onPrevAction={handlePrev}
          onNextAction={handleNext}
        />
      ) : null}
    </div>
  );
}
