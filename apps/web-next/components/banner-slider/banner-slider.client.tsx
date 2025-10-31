"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "./banner-slider.css";
import type { BannerRecord } from "@/lib/banners";
import { BannerCard } from "./banner-card";

type BannerSliderClientProps = {
  initialBanners: BannerRecord[];
  apiEndpoint?: string;
  autoplayMs?: number;
  fallbackId: string;
};

const API_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_AUTOPLAY_MS = 5000;
const DEFAULT_API_ENDPOINT = "/api/banners";
const BLOCKED_REMOTE_IMAGE_HOSTS = new Set(["cdn.example.com"]);

export function BannerSliderClient({
  initialBanners,
  apiEndpoint = DEFAULT_API_ENDPOINT,
  autoplayMs = DEFAULT_AUTOPLAY_MS,
  fallbackId,
}: BannerSliderClientProps) {
  const [banners, setBanners] = useState(initialBanners);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const fallback = document.getElementById(fallbackId);
    if (fallback) {
      fallback.setAttribute("hidden", "");
      fallback.classList.add("hidden");
    }
  }, [fallbackId]);

  useEffect(() => {
    async function refresh() {
      try {
        const response = await fetch(apiEndpoint, { cache: "no-store" });
        if (!response.ok) return;
        const json = await response.json();
        const nextBanners = extractBanners(json);
        if (nextBanners.length === 0) return;
        setBanners((current) => {
          const currentKey = serialize(current);
          const nextKey = serialize(nextBanners);
          return currentKey === nextKey ? current : nextBanners;
        });
      } catch {
        // swallow network errors; rely on ISR fallback
      }
    }

    refresh();
    timerRef.current = window.setInterval(refresh, API_REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [apiEndpoint]);

  const autoplay = useMemo(
    () => ({
      delay: Math.max(autoplayMs, 1000),
      disableOnInteraction: false,
    }),
    [autoplayMs],
  );

  if (!banners.length) {
    return null;
  }

  return (
    <div className="banner-slider">
      <Swiper
        modules={[Autoplay, Pagination, A11y]}
        autoplay={autoplay}
        pagination={{ clickable: true }}
        loop={banners.length > 1}
        spaceBetween={24}
        slidesPerView={1}
        className="banner-slider__swiper"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id} className="banner-slider__slide">
            <BannerCard banner={banner} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

function extractBanners(payload: unknown): BannerRecord[] {
  if (!payload || typeof payload !== "object") return [];
  const banners = Array.isArray((payload as any).banners) ? (payload as any).banners : [];

  const normalized: BannerRecord[] = banners
    .map((item: any): BannerRecord | null => {
      if (!item) return null;
      const id = typeof item.id === "string" ? item.id : String(item.id ?? "");
      const title = typeof item.title === "string" ? item.title : "";
      const imageUrlRaw = typeof item.imageUrl === "string" ? item.imageUrl : item.image_url ?? "";
      const imageUrl = sanitizeImageUrl(imageUrlRaw);
      const href = typeof item.href === "string" ? item.href : "";
      if (!id || !title || !imageUrl || !href) return null;
      return {
        id,
        title,
        subtitle: typeof item.subtitle === "string" && item.subtitle ? item.subtitle : null,
        imageUrl,
        href,
        priority: Number.isFinite(item.priority) ? Number(item.priority) : 0,
        activeFrom: typeof item.activeFrom === "string" ? item.activeFrom : null,
        activeTo: typeof item.activeTo === "string" ? item.activeTo : null,
      };
    })
    .filter((banner: BannerRecord | null): banner is BannerRecord => Boolean(banner));

  return normalized.sort((a: BannerRecord, b: BannerRecord) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return b.id.localeCompare(a.id);
  });
}

function serialize(banners: BannerRecord[]): string {
  return banners.map((banner) => `${banner.id}:${banner.priority}`).join("|");
}

function sanitizeImageUrl(value: string): string | null {
  if (!value) return null;
  if (/^https?:/i.test(value)) {
    try {
      const parsed = new URL(value);
      if (BLOCKED_REMOTE_IMAGE_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith(".example.com")) {
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }
  return value;
}
