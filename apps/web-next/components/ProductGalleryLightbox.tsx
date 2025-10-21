"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@ui/components/common/dialog";

type ProductGalleryLightboxProps = {
  title: string;
  open: boolean;
  onOpenChangeAction: (value: boolean) => void;
  images: string[];
  index: number;
  current?: string | null;
  onPrevAction: () => void;
  onNextAction: () => void;
};

export default function ProductGalleryLightbox({
  title,
  open,
  onOpenChangeAction,
  images,
  index,
  current,
  onPrevAction,
  onNextAction,
}: ProductGalleryLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 flex items-center justify-center border-none bg-transparent p-0 shadow-none outline-none"
      >
        <div className="relative h-[80vh] w-[min(90vw,900px)] overflow-hidden rounded-3xl bg-black/80 p-6 shadow-2xl">
          <DialogTitle className="sr-only">Предпросмотр изображения {title}</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChangeAction(false)}
            className="absolute right-6 top-6 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Закрыть предпросмотр"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          {images.length > 1 ? (
            <button
              type="button"
              onClick={onPrevAction}
              className="absolute left-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:flex"
              aria-label="Предыдущее фото"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
          ) : null}

          {current ? (
            <Image
              key={`lightbox-${current}`}
              src={current}
              alt={title}
              fill
              sizes="900px"
              className="pointer-events-none select-none object-contain"
              priority={false}
            />
          ) : null}

          {images.length > 1 ? (
            <button
              type="button"
              onClick={onNextAction}
              className="absolute right-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:flex"
              aria-label="Следующее фото"
            >
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          ) : null}

          {images.length > 1 ? (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
              {index + 1} / {images.length}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
