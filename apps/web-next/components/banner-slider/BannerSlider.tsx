import { getActiveBanners } from "@/lib/banners";
import { BannerCard } from "./banner-card";
import { BannerSliderClient } from "./banner-slider.client";

export async function BannerSlider() {
  const banners = await getActiveBanners();
  if (!banners.length) {
    return null;
  }

  const fallbackId = `banner-slider-fallback-${banners[0].id}`;

  return (
    <section
      aria-labelledby="banner-slider-heading"
      className="mx-auto w-full max-w-screen-xl space-y-6 px-4 sm:px-6 lg:px-8"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Highlights</p>
        <h2 id="banner-slider-heading" className="text-3xl font-semibold text-fg sm:text-4xl">
          Stay in the loop with live campaigns
        </h2>
        <p className="max-w-2xl text-sm text-muted">
          Fresh banner placements sync automatically from the CMS so you can spotlight timely promos without extra
          deploys.
        </p>
      </div>

      <div className="relative">
        <div id={fallbackId}>
          <BannerCard banner={banners[0]} loading="eager" priority />
        </div>
        <BannerSliderClient initialBanners={banners} fallbackId={fallbackId} />
        <noscript>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {banners.slice(0, 2).map((banner) => (
              <BannerCard key={banner.id} banner={banner} loading="lazy" />
            ))}
          </div>
        </noscript>
      </div>
    </section>
  );
}

