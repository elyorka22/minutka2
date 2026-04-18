import Image from "next/image";
import Link from "next/link";
import { imageUrl } from "../lib/api";
import type { HomepageBanner, HomepageRestaurant } from "../lib/api-server";

type PromoRestaurantRef = Pick<HomepageRestaurant, "id" | "name" | "coverUrl" | "logoUrl">;

type Props = {
  banner: HomepageBanner | null;
  fallbackRestaurant: PromoRestaurantRef | null;
};

function clampFocus(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Server component: hero LCP without extra client hydration. */
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
    (fallbackRestaurant ? `/restaurants/${fallbackRestaurant.id}` : "/");
  const imgAlt =
    banner?.title?.trim() ||
    fallbackRestaurant?.name?.trim() ||
    "Bosh sahifa aksiyasi";

  const src = rawImg ? imageUrl(rawImg) : "";

  return (
    <article className="fd-home-vv-promo">
      <Link href={ctaHref} className="fd-home-vv-promo-link" aria-label={imgAlt}>
        <div className="fd-home-vv-promo-media">
          {src ? (
            <Image
              src={src}
              alt={imgAlt}
              fill
              className="fd-home-vv-promo-img"
              quality={74}
              priority
              fetchPriority="high"
              sizes="(max-width: 640px) 100vw, min(1100px, 100vw)"
              style={{ objectFit: "cover", objectPosition }}
              decoding="async"
            />
          ) : (
            <div className="fd-home-vv-promo-placeholder" aria-hidden />
          )}
        </div>
      </Link>
    </article>
  );
}
