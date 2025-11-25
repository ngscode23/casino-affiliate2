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
    <section className="relative overflow-hidden rounded-[32px] border border-border/40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-6 py-14 text-white shadow-[0_40px_140px_-70px_rgba(0,0,0,0.7)] sm:px-10 sm:py-16 lg:py-18">
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          {hero.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/70">{hero.eyebrow}</p>
          ) : null}
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {hero.title}
          </h1>
          {hero.body ? <p className="max-w-2xl text-lg text-white/80">{hero.body}</p> : null}
          <div className="flex flex-wrap gap-3">
            {hero.primaryCta ? (
              <Link
                href={hero.primaryCta.href}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primaryfg shadow-[0_28px_68px_-32px_rgba(252,50,114,0.65)] transition hover:-translate-y-[1px]"
              >
                {hero.primaryCta.label}
              </Link>
            ) : null}
            {hero.secondaryCta ? (
              <Link
                href={hero.secondaryCta.href}
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:border-white/60"
              >
                {hero.secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>

        {hero.imageUrl ? (
          <div className="relative isolate">
            <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-primary/30 blur-3xl" aria-hidden />
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.75)]">
              <Image
                src={hero.imageUrl}
                alt={hero.imageAlt || hero.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 640px"
                className="object-cover"
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
    <section className="relative overflow-hidden rounded-[32px] border border-border/40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-6 py-14 sm:px-10 sm:py-16 lg:py-18">
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
