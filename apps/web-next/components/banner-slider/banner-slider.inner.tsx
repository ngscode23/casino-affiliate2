"use client";

import { memo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Autoplay, Pagination } from "swiper/modules";

import type { BannerRecord } from "@/lib/banners";

import { BannerCard } from "./banner-card";
import "swiper/css";
import "swiper/css/pagination";
import "./banner-slider.css";

type BannerSliderInnerProps = {
  banners: BannerRecord[];
  autoplay: {
    delay: number;
    disableOnInteraction: boolean;
  };
};

export const BannerSliderInner = memo(function BannerSliderInner({ banners, autoplay }: BannerSliderInnerProps) {
  return (
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
  );
});
