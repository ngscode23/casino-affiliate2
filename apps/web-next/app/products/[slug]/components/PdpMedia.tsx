import ProductGallery from "@/components/ProductGallery";

type PdpMediaProps = {
  title: string;
  images: string[];
  fallbackImage?: string;
  activeImage?: string;
  onActiveChange: (url: string) => void;
};

export function PdpMedia({ title, images, fallbackImage = "/logo.png", activeImage, onActiveChange }: PdpMediaProps) {
  return (
    <div className="max-[923px]:min-w-[calc(100vw-3rem)] max-[923px]:snap-center">
      <ProductGallery
        title={title}
        images={images}
        fallbackImage={fallbackImage}
        activeImage={activeImage}
        onActiveChangeAction={(_, idx) => onActiveChange(images[idx] ?? fallbackImage)}
      />
    </div>
  );
}
