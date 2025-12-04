import type { HeroPayload } from "@/lib/hero";
import { HERO_TAG, getActiveHeroes } from "@/lib/hero";
import { HeroSlider } from "./HeroSlider.client";

export const revalidate = 300;
export const fetchCache = "default";
export const dynamic = "force-static";
export const tags = [HERO_TAG];

function normalizeHero(hero: HeroPayload): HeroPayload {
  const title = hero.title?.trim().toLowerCase() ?? "";
  const body = hero.body?.trim().toLowerCase() ?? "";

  const isPlaceholder =
    title === "" ||
    title === "2222" ||
    title.startsWith("lorem ipsum") ||
    body.includes("dsfgrhhhrhereabaebr");

  if (!isPlaceholder) return hero;

  return {
    ...hero,
    eyebrow: "Новинки недели",
    title: "Neon Shop – электроника и аксессуары с доставкой",
    body: "Смартфоны, аудио, умный дом и зарядные устройства с быстрой доставкой и проверенными брендами.",
    primaryCta: { label: "Перейти в каталог", href: "/products" },
    secondaryCta: { label: "Смотреть акции", href: "/products?view=deals" },
    imageAlt: hero.imageAlt || hero.title || "Neon Shop hero banner",
  };
}

export async function HeroSection() {
  const heroesRaw = await getActiveHeroes();
  if (!heroesRaw || heroesRaw.length === 0) return null;

  const normalizedHeroes = heroesRaw.map(normalizeHero);

  return <HeroSlider heroes={normalizedHeroes} />;
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

