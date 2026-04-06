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

/** Width closest to hero max display (~600px) for preload + mobile LCP. */
export const HERO_IMAGE_PRELOAD_WIDTH = 640;
