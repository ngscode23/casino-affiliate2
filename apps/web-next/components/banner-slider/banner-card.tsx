import Image from "next/image";
import Link from "next/link";
import type { BannerRecord } from "@/lib/banners";

type BannerCardProps = {
  banner: BannerRecord;
  loading?: "lazy" | "eager";
  priority?: boolean;
};

export function BannerCard({ banner, loading = "lazy", priority = false }: BannerCardProps) {
  const { title, subtitle, imageUrl, href } = banner;

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="relative isolate overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/80 shadow-[0_32px_120px_-80px_rgba(12,18,36,0.85)] transition hover:border-primary/40">
      <div className="absolute inset-0">
        <Image
          src={imageUrl}
          alt={subtitle ? `${title} — ${subtitle}` : title}
          fill
          loading={loading}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1200px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/30 to-transparent mix-blend-multiply" />
      </div>
      <div className="relative z-10 flex h-full flex-col justify-between gap-6 p-10 text-white sm:flex-row sm:items-center">
        <div className="max-w-xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/70">Featured</p>
          <h3 className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</h3>
          {subtitle ? <p className="max-w-lg text-sm text-white/80">{subtitle}</p> : null}
        </div>
        <div className="flex w-full max-w-[200px] justify-end sm:justify-center">
          <Link
            href={href}
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/20 bg-white/90 px-6 text-sm font-semibold text-slate-900 shadow-[0_24px_48px_-32px_rgba(255,255,255,0.9)] transition hover:-translate-y-px hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
            prefetch={false}
          >
            Learn more
          </Link>
        </div>
      </div>
    </div>
  );
}
