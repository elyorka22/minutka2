"use client";

import Link from "next/link";
import { imageUrl } from "../lib/api";
import type { HomepageBanner, HomepageRestaurant } from "../lib/api-server";
import { SafeImage } from "./SafeImage";

type Props = {
  banner: HomepageBanner | null;
  fallbackRestaurant: HomepageRestaurant | null;
};

function clampFocus(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function HomePromoBanner({ banner, fallbackRestaurant }: Props) {
  const rawImg =
    banner?.imageUrl?.trim() ||
    fallbackRestaurant?.coverUrl ||
    fallbackRestaurant?.logoUrl ||
    null;
  const usesBannerImage = Boolean(banner?.imageUrl?.trim());
  const objectPosition =
    usesBannerImage &&
    typeof banner?.imageFocusX === "number" &&
    typeof banner?.imageFocusY === "number"
      ? `${clampFocus(banner.imageFocusX)}% ${clampFocus(banner.imageFocusY)}%`
      : "center";
  const ctaHref =
    banner?.ctaHref?.trim() ||
    (fallbackRestaurant ? `/restaurants/${fallbackRestaurant.id}` : "/restaurants");
  const imgAlt =
    banner?.title?.trim() ||
    fallbackRestaurant?.name?.trim() ||
    "Bosh sahifa aksiyasi";

  return (
    <article className="fd-home-vv-promo">
      <Link href={ctaHref} className="fd-home-vv-promo-link" aria-label={imgAlt}>
        <div className="fd-home-vv-promo-media">
          {rawImg ? (
            <SafeImage
              src={imageUrl(rawImg)}
              alt={imgAlt}
              fill
              className="fd-home-vv-promo-img"
              quality={80}
              priority
              sizes="(max-width: 640px) 100vw, min(1100px, 100vw)"
              style={{ objectFit: "cover", objectPosition }}
              fallbackClassName="fd-home-vv-promo-placeholder fd-home-vv-promo-placeholder--fallback"
              fallbackStyle={{ position: "absolute", inset: 0 }}
            />
          ) : (
            <div className="fd-home-vv-promo-placeholder" aria-hidden />
          )}
        </div>
      </Link>
    </article>
  );
}
