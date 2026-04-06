"use client";

import { SafeImage } from "./SafeImage";

type Props = {
  src: string;
  /** First slide = LCP: eager, high fetch priority, not lazy. */
  isPrimary: boolean;
};

/**
 * Home hero banner: WebP/AVIF via next/image, capped ~600px via sizes, LCP path when isPrimary.
 */
export function HeroBannerImage({ src, isPrimary }: Props) {
  return (
    <SafeImage
      src={src}
      alt=""
      className="fd-banner-img"
      fill
      priority={isPrimary}
      quality={isPrimary ? 75 : 76}
      sizes={
        isPrimary
          ? "(max-width: 768px) min(100vw, 600px), 600px"
          : "(max-width: 768px) min(100vw, 480px), 480px"
      }
    />
  );
}
