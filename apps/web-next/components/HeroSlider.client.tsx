"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { HeroPayload } from "@/lib/hero";

type HeroSliderProps = {
  heroes: HeroPayload[];
};

const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PQ8lWAAAAABJRU5ErkJggg==";

/**
 * Hero slider with smooth slide animation between banners.
 */
export function HeroSlider({ heroes }: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const count = heroes.length;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (event: MediaQueryListEvent | MediaQueryList) => setReduceMotion(event.matches);
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const hasMultiple = count > 1;

  const goTo = useCallback(
    (next: number) => {
      if (!hasMultiple || count === 0) return;
      const normalized = ((next % count) + count) % count;
      setIndex(normalized);
    },
    [count, hasMultiple],
  );

  const handlePrev = useCallback(() => {
    goTo(index - 1);
  }, [goTo, index]);

  const handleNext = useCallback(() => {
    goTo(index + 1);
  }, [goTo, index]);

  if (count === 0) return null;

  return (
    <section
      className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#050816] px-6 py-16 text-white shadow-[0_32px_90px_-60px_rgba(0,0,0,0.9)] sm:px-10 lg:py-20"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured stories"
      aria-live="off"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          handlePrev();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          handleNext();
        }
      }}
    >
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform ease-out"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transitionDuration: reduceMotion ? "0ms" : "500ms",
          }}
        >
          {heroes.map((hero, heroIndex) => (
            <div key={hero.id} className="min-w-full">
              <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_minmax(0,0.9fr)]">
                <div className="space-y-6">
                  {hero.eyebrow ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/70">
                      {hero.eyebrow}
                    </p>
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
                        priority={heroIndex === 0}
                        loading={heroIndex === 0 ? "eager" : "lazy"}
                        quality={heroIndex === 0 ? 70 : 55}
                        placeholder="blur"
                        blurDataURL={buildBlurDataURL(hero.imageUrl)}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {hasMultiple ? (
          <div className="mt-6 flex items-center gap-3 text-xs text-white/60">
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold uppercase tracking-[0.2em] hover:bg-white/20"
              aria-label="Предыдущий баннер"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold uppercase tracking-[0.2em] hover:bg-white/20"
              aria-label="Следующий баннер"
            >
              ›
            </button>
            <div className="flex items-center gap-1">
              {heroes.map((hero, idx) => (
                <button
                  key={hero.id ?? idx}
                  type="button"
                  onClick={() => goTo(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === index ? "w-4 bg-white" : "w-2 bg-white/35"}`}
                  aria-label={`Слайд баннера ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function buildBlurDataURL(src?: string | null): string {
  if (!src) return BLUR_DATA_URL;
  if (src.startsWith("data:")) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}auto=format&fit=crop&w=32&h=24&blur=18&q=30`;
}
