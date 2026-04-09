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
  const title = banner?.title?.trim() || "Mahsulotlar va taomlar";
  const text =
    banner?.text?.trim() ||
    "Shahardagi do‘kon va restoranlardan bir joyda buyurtma qiling.";
  const rawImg =
    banner?.imageUrl?.trim() ||
    fallbackRestaurant?.coverUrl ||
    fallbackRestaurant?.logoUrl ||
    null;
  const ctaLabel = banner?.ctaLabel?.trim() || "Boshlash";
  const ctaHref =
    banner?.ctaHref?.trim() ||
    (fallbackRestaurant ? `/restaurants/${fallbackRestaurant.id}` : "/restaurants");

  return (
    <article className="fd-home-vv-promo">
      <Link href={ctaHref} className="fd-home-vv-promo-link">
        <div className="fd-home-vv-promo-media">
          {rawImg ? (
            <SafeImage
              src={imageUrl(rawImg)}
              alt=""
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
        <div className="fd-home-vv-promo-body">
          <h2 className="fd-home-vv-promo-title">{title}</h2>
          <p className="fd-home-vv-promo-text">{text}</p>
          <span className="fd-btn fd-btn-primary fd-home-vv-promo-cta">{ctaLabel}</span>
        </div>
      </Link>
    </article>
  );
}
