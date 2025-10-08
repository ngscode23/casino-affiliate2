"use client";

import dynamic from "next/dynamic";
import type { HeroSlide, HeroSliderProps } from "./hero-slider";

const DynamicHeroSlider = dynamic<HeroSliderProps>(() => import("./hero-slider"), {
  ssr: false,
  loading: () => <HeroSliderFallback />,
});

type HeroSliderClientProps = {
  slides: HeroSlide[];
  className?: string;
};

export function HeroSliderClient({ slides, className }: HeroSliderClientProps) {
  return <DynamicHeroSlider slides={slides} className={className} />;
}

function HeroSliderFallback() {
  return (
    <div className="rounded-[48px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-24 text-center text-white">
      <div className="mx-auto max-w-xl space-y-4 px-6">
        <p className="text-sm uppercase tracking-[0.32em] text-white/60">Loading hero</p>
        <p className="text-2xl font-semibold text-white">Preparing featured highlights…</p>
      </div>
    </div>
  );
}
