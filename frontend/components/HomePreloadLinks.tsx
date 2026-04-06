import {
  HERO_IMAGE_PRELOAD_QUALITY,
  HERO_IMAGE_PRELOAD_WIDTH,
  nextImageLoaderHref,
} from "../lib/next-image-loader-href";

/**
 * Preloads the optimized hero URL (not the raw CDN URL) so it matches next/image.
 */
export function HomePreloadLinks({ href }: { href: string | null | undefined }) {
  const u = (href || "").trim();
  if (!u) return null;
  const optimized = nextImageLoaderHref(
    u,
    HERO_IMAGE_PRELOAD_WIDTH,
    HERO_IMAGE_PRELOAD_QUALITY,
  );
  return <link rel="preload" as="image" href={optimized} fetchPriority="high" />;
}
