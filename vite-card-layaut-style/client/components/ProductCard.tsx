import React from "react";

export type ProductCardProps = {
  title: string;
  subtitle: string;
  href: string;
  images: { primary: string; secondary?: string; altPrimary: string; altSecondary?: string };
  colors?: string[]; // hex colors
  badge?: string;
};

export default function ProductCard({
  title,
  subtitle,
  href,
  images,
  colors = [],
  badge,
}: ProductCardProps) {
  return (
    <div className="bg-white rounded-[25px] shadow-product flex flex-col min-w-[320px] w-full p-[7px]">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={`Go to ${title}`}
        className="group relative block w-full rounded-[18px] bg-[#f3f3f3] pt-[100%]"
      >
        <div className="absolute top-2 right-2 z-10 flex justify-end w-full pr-2">
          {badge ? (
            <div className="bg-brand text-white uppercase text-[11px] leading-[12.21px] font-semibold tracking-[-0.01em] px-[10px] pt-[5px] pb-[4px] rounded-full border border-black/10 shadow-md w-fit">
              {badge}
            </div>
          ) : null}
        </div>
        <div className="absolute inset-0 rounded-[18px]">
          <img
            src={images.primary}
            alt={images.altPrimary}
            className="absolute inset-[10px] rounded-[11px] object-cover w-[calc(100%-20px)] h-[calc(100%-20px)] transition-opacity duration-150 z-[1] group-hover:opacity-0"
          />
          {images.secondary ? (
            <img
              src={images.secondary}
              alt={images.altSecondary || images.altPrimary}
              className="absolute inset-[10px] rounded-[11px] object-cover w-[calc(100%-20px)] h-[calc(100%-20px)] opacity-0 transition-opacity duration-150 z-[1] group-hover:opacity-100"
            />
          ) : null}
        </div>
      </a>

      <div className="flex flex-col flex-1 px-2 py-2">
        <div>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline"
            aria-label={`Go to ${title}`}
          >
            <h2 className="font-bold text-[24px] leading-[26.64px] tracking-[-0.04em] pt-[1px]">
              {title}
            </h2>
          </a>
          <a href={href} target="_blank" rel="noreferrer" className="inline">
            <p className="text-[14px] leading-[19px] tracking-[-0.01em] text-foreground/80">
              {subtitle}
            </p>
          </a>
        </div>

        {colors.length > 0 ? (
          <div className="pt-2 flex items-end">
            <div className="flex flex-wrap items-center gap-y-[3px] gap-x-0">
              {colors.map((c, i) => (
                <div key={i} className="h-[23px] flex items-center mr-2">
                  <button aria-label="color option" className="inline-block bg-transparent">
                    <div className="w-[25px] h-[25px] rounded-full border border-black/80 p-[2px]">
                      <div
                        className="w-full h-full rounded-full"
                        style={{ backgroundColor: c }}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
