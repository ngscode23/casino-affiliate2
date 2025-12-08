"use client";;
import { iconSm } from "@/styles/classnames";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Package,
  Pause,
  Play,
  Quote,
  Sparkles,
  Star,
  Tag,
  Truck,
} from "lucide-react";
import { cn } from "@shared/lib/cn";

type HeroVisual = "storefront" | "checkout" | "delivery" | "promo" | "reviews";

export type HeroSlide = {
  id: string;
  eyebrow?: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  backgroundClass?: string;
  highlights?: string[];
  metrics?: Array<{ label: string; value: string; detail?: string }>;
  visual?: HeroVisual;
};

const AUTOPLAY_INTERVAL = 6000;

export type HeroSliderProps = {
  slides: HeroSlide[];
  className?: string;
};

function HeroSlider({ slides, className }: HeroSliderProps) {
  const safeSlides = useMemo(() => slides.filter(Boolean), [slides]);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const slideCount = safeSlides.length;

  const goTo = useCallback(
    (next: number) => {
      if (!slideCount) return;
      setIndex((next + slideCount) % slideCount);
    },
    [slideCount],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (event: MediaQueryListEvent | MediaQueryList) => setReduceMotion(event.matches);
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (slideCount <= 1 || isPaused || reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => ((prev + 1) % slideCount + slideCount) % slideCount);
    }, AUTOPLAY_INTERVAL);
    return () => window.clearInterval(timer);
  }, [isPaused, reduceMotion, slideCount]);

  const activeSlide = safeSlides[index] ?? safeSlides[0];

  if (!activeSlide) return null;

  return (
    <section
      className={cn(
        "relative overflow-hidden text-white",
        className,
        activeSlide.backgroundClass ?? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-live="off"
      aria-label="Featured hero stories"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%)]" aria-hidden />
      <div className="mx-auto flex w-full max-w-screen-xl flex-col items-center gap-4 px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="relative w-full">
          <div className="relative grid min-h-[200px] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)] lg:items-center">
            {safeSlides.map((slide, slideIndex) => (
              <article key={slide.id} className="contents" aria-hidden={slideIndex !== index}>
                <div
                  className={cn(
                    "relative mx-auto flex w-full max-w-3xl flex-col items-center transition-all duration-700 ease-out lg:items-start lg:text-left",
                    slideIndex === index
                      ? "pointer-events-auto opacity-100 translate-y-0"
                      : "hidden pointer-events-none opacity-0 translate-y-6",
                  )}
                >
                  {slide.eyebrow ? (
                    <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                      <Sparkles className="h-3 w-3" />
                      {slide.eyebrow}
                    </span>
                  ) : null}
                  <h1 className="text-2xl font-semibold sm:text-4xl md:text-5xl">{slide.title}</h1>
                  <p className="mt-3 text-sm text-slate-200 sm:text-lg">{slide.description}</p>
                  <HeroHighlights id={slide.id} highlights={slide.highlights} />
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                    <Link
                      href={slide.primaryCta.href}
                      className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:-translate-y-[1px] hover:bg-slate-100"
                    >
                      {slide.primaryCta.label}
                    </Link>
                    {slide.secondaryCta ? (
                      <Link
                        href={slide.secondaryCta.href}
                        className="rounded-md border border-white/60 px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-[1px] hover:border-white hover:bg-white/10"
                      >
                        {slide.secondaryCta.label}
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div
                  className={cn(
                    "relative hidden overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-4 text-left text-white shadow-[0_50px_80px_-32px_rgba(15,23,42,0.55)] backdrop-blur-lg transition-all duration-700 ease-out lg:block",
                    slideIndex === index
                      ? "pointer-events-auto opacity-100 translate-y-0 scale-100"
                      : "pointer-events-none opacity-0 translate-y-6 scale-95 lg:hidden",
                  )}
                >
                  {renderVisual(slide)}
                  <div className="pointer-events-none absolute -right-10 top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-indigo-400/30 blur-3xl" />
                </div>
              </article>
            ))}
          </div>
        </div>

        {slideCount > 1 ? (
          <div className="mt-4 flex w-full max-w-3xl items-center justify-between gap-4 lg:mt-6 lg:max-w-none">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:h-9 sm:w-9"
                aria-label={isPaused ? "Resume autoplay" : "Pause slides"}
              >
                {isPaused ? <Play className={iconSm} /> : <Pause className={iconSm} />}
              </button>
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:h-9 sm:w-9"
                aria-label="Previous slide"
              >
                <ChevronLeft className={iconSm} />
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:h-9 sm:w-9"
                aria-label="Next slide"
              >
                <ChevronRight className={iconSm} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {safeSlides.map((slide, slideIndex) => (
                <button
                  key={`${slide.id}-dot`}
                  type="button"
                  onClick={() => goTo(slideIndex)}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition",
                    slideIndex === index ? "bg-white" : "bg-white/40 hover:bg-white/70",
                  )}
                  aria-label={`Go to slide ${slideIndex + 1}`}
                  aria-current={slideIndex === index}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export { HeroSlider };
export default HeroSlider;

function renderVisual(slide: HeroSlide) {
  switch (slide.visual) {
    case "storefront":
      return <StorefrontVisual />;
    case "checkout":
      return <CheckoutVisual />;
    case "delivery":
      return <DeliveryVisual />;
    case "promo":
      return <PromoVisual />;
    case "reviews":
      return <ReviewsVisual />;
    default:
      if (slide.metrics?.length) {
        return (
          <div className="mt-1 grid gap-4">
            {slide.metrics.map((metric) => (
              <div
                key={`${slide.id}-${metric.label}`}
                className="rounded-2xl bg-white/5 p-4 shadow-[0_18px_36px_rgba(14,20,37,0.35)]"
              >
                <div className="text-sm text-white/70">{metric.label}</div>
                <div className="mt-1 text-2xl font-semibold text-white">{metric.value}</div>
                {metric.detail ? <p className="mt-1 text-xs text-white/60">{metric.detail}</p> : null}
              </div>
            ))}
          </div>
        );
      }
      return (
        <p className="text-sm text-white/70">
          Swipe through to see storefront layouts, checkout flow, delivery perks, promo tools, and customer reviews.
        </p>
      );
  }
}

function StorefrontVisual() {
  const products = [
    { name: "Aurora Desk Lamp", price: "", color: "from-indigo-500 to-purple-500" },
    { name: "Reverie Throw", price: "", color: "from-emerald-500 to-teal-400" },
  ];
  return (
    <div className="grid gap-4 text-slate-900">
      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Storefront</div>
      <div className="grid gap-3">
        {products.map((product) => (
          <div key={product.name} className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg">
            <div className={cn("h-14 w-14 rounded-xl bg-gradient-to-br", product.color)} />
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">{product.name}</div>
              <div className="text-xs text-slate-500">In stock - Bestseller</div>
            </div>
            <div className="text-sm font-semibold text-slate-900">{product.price}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-slate-900/90 p-3 text-white shadow-inner">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-white/70">Orders today</div>
          <div className="text-lg font-semibold">+48 placed</div>
        </div>
        <div className="text-right text-xs text-white/70">
          Conversion <span className="font-semibold text-white">+18%</span>
        </div>
      </div>
    </div>
  );
}

function CheckoutVisual() {
  return (
    <div className="flex flex-col gap-4 text-slate-900">
      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Checkout</div>
      <div className="rounded-2xl bg-white/95 p-4 shadow-xl">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>.00</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
          <span>Shipping</span>
          <span>Free</span>
        </div>
        <div className="mt-4 flex items-center justify-between text-base font-semibold text-slate-900">
          <span>Total</span>
          <span>.00</span>
        </div>
        <button className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
          Pay securely
        </button>
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
          <CreditCard className={iconSm} /> Cards / Apple Pay / Google Pay
        </p>
      </div>
    </div>
  );
}

function DeliveryVisual() {
  const perks = [
    { icon: Truck, title: "Fast shipping", detail: "1-2 days nationwide" },
    { icon: Package, title: "Live tracking", detail: "Updates in customer portal" },
    { icon: Star, title: "Easy returns", detail: "30-day hassle-free policy" },
  ];
  return (
    <div className="grid gap-4 text-left">
      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Customer care</div>
      <div className="grid gap-3">
        {perks.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex items-start gap-3 rounded-2xl bg-white/8 p-4">
            <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
              <Icon className={iconSm} />
            </span>
            <div>
              <div className="text-sm font-semibold text-white">{title}</div>
              <p className="text-xs text-white/70">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromoVisual() {
  return (
    <div className="flex flex-col gap-4 text-left text-slate-900">
      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Promotions</div>
      <div className="rounded-3xl bg-gradient-to-br from-yellow-300 via-amber-200 to-pink-200 p-5 text-slate-900 shadow-2xl">
        <div className="text-xs uppercase tracking-[0.4em] text-slate-700">Today only</div>
        <div className="mt-2 text-4xl font-bold">Up to 30% off</div>
        <p className="mt-3 text-sm text-slate-700">
          Launch flash sales and coupons from the admin panel. The storefront updates instantly across all channels.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-900">
          <Tag className={iconSm} /> FREESHIP
        </div>
      </div>
    </div>
  );
}

function ReviewsVisual() {
  const reviews = [
    {
      name: "Anna",
      text: "\"We launched our shop in a week. Managing inventory and promos is finally easy.\"",
    },
    {
      name: "Nikita",
      text: "\"Mobile checkout feels like native - customers mention how quick it is.\"",
    },
  ];
  return (
    <div className="grid gap-3 text-left">
      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Reviews</div>
      {reviews.map((review) => (
        <figure key={review.name} className="rounded-2xl bg-white/8 p-4 shadow-lg">
          <Quote className="h-5 w-5 text-white/40" />
          <blockquote className="mt-2 text-sm text-white/80">{review.text}</blockquote>
          <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
            {review.name}
          </figcaption>
        </figure>
      ))}
      <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-white/50">4.9 / 5 - 2,500+ reviews</p>
    </div>
  );
}


function HeroHighlights({ id, highlights }: { id: string; highlights?: string[] }) {
  if (!highlights?.length) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs uppercase tracking-[0.22em] text-white/70 sm:text-[13px] lg:justify-start">
      {highlights.map((highlight, index) => (
        <span key={`${id}-highlight-${highlight}`} className="flex items-center gap-3">
          {index > 0 ? <span className="hidden h-px w-8 bg-white/25 sm:block" aria-hidden /> : null}
          <span className="flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-white/80">
            {highlight}
          </span>
        </span>
      ))}
    </div>
  );
}









