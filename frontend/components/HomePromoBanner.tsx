"use client";

import Link from "next/link";
import { imageUrl } from "../lib/api";
import type { HomepageBanner, HomepageRestaurant } from "../lib/api-server";
import { SafeImage } from "./SafeImage";

type Props = {
  banner: HomepageBanner | null;
  fallbackRestaurant: HomepageRestaurant | null;
};

export function HomePromoBanner({ banner, fallbackRestaurant }: Props) {
  const rawImg =
    banner?.imageUrl?.trim() ||
    fallbackRestaurant?.coverUrl ||
    fallbackRestaurant?.logoUrl ||
    null;
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
              className="fd-home-vv-promo-img"
              width={800}
              height={500}
              quality={80}
              priority
              sizes="(max-width: 640px) 100vw, 800px"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              fallbackStyle={{ minHeight: 180 }}
            />
          ) : (
            <div className="fd-home-vv-promo-placeholder" aria-hidden />
          )}
        </div>
      </Link>
    </article>
  );
}
