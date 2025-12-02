import Image from "next/image";
import Link from "next/link";
import { HERO_TAG, getActiveHero } from "@/lib/hero";

export const revalidate = 300;
export const fetchCache = "default";
export const dynamic = "force-static";
export const tags = [HERO_TAG];

export async function HeroSection() {
  const hero = await getActiveHero();
  if (!hero) return null;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#050816] px-6 py-16 text-white shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)] sm:px-10 lg:py-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_minmax(0,0.9fr)]">
        <div className="space-y-6">
          {hero.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/70">{hero.eyebrow}</p>
          ) : null}
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] sm:text-6xl">
            {hero.title}
          </h1>
          {hero.body ? <p className="max-w-xl text-lg text-white/80">{hero.body}</p> : null}
          <div className="flex flex-wrap items-center gap-4">
            {hero.primaryCta ? (
              <Link
                href={hero.primaryCta.href}
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-900 shadow-sm transition-transform duration-160 ease-out hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0 active:scale-[0.97]"
              >
                {hero.primaryCta.label}
              </Link>
            ) : null}
            {hero.secondaryCta ? (
              <Link
                href={hero.secondaryCta.href}
                className="inline-flex items-center text-sm font-semibold text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {hero.secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>

        {hero.imageUrl ? (
          <div className="relative isolate flex justify-end">
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-[26px] border border-white/12 bg-white/5 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.85)]">
              <Image
                src={hero.imageUrl}
                alt={hero.imageAlt || hero.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 640px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function HeroSectionSkeleton() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#050816] px-6 py-16 sm:px-10 sm:py-16 lg:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <div className="h-3 w-24 rounded-full bg-white/20 animate-pulse" />
          <div className="h-10 w-3/4 rounded-lg bg-white/30 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-white/20 animate-pulse" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-28 rounded-full bg-white/20 animate-pulse" />
            <div className="h-11 w-28 rounded-full bg-white/20 animate-pulse" />
          </div>
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/10 animate-pulse" />
      </div>
    </section>
  );
}
