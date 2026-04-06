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

/** Mobile hero ~≤600px CSS — 640px asset balances sharpness vs bytes (<~100KB typical WebP). */
export const HERO_IMAGE_PRELOAD_WIDTH = 640;

/** Same `q` as primary hero `<Image quality={…} />` so preload matches `/_next/image` request. */
export const HERO_IMAGE_PRELOAD_QUALITY = 70;
