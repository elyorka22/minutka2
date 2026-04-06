/**
 * Relative href for Next.js Image Optimization (same request as <Image />).
 * Use for <link rel="preload"> so the browser does not fetch the raw URL twice.
 */
export function nextImageLoaderHref(
  src: string,
  width: number,
  quality: number,
): string {
  const u = (src || "").trim();
  if (!u) return "";
  return `/_next/image?url=${encodeURIComponent(u)}&w=${width}&q=${quality}`;
}

/** Matches typical next/image srcset pick for mobile hero (2× logical width ~375). */
export const HERO_IMAGE_PRELOAD_WIDTH = 750;

/** Same `q` as primary hero `<Image quality={…} />` so preload hits one cached URL. */
export const HERO_IMAGE_PRELOAD_QUALITY = 72;
