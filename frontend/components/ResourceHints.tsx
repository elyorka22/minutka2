import type { ReactNode } from "react";

/**
 * Preconnect/dns-prefetch to API origin so banner and card images start earlier (mobile LCP).
 * Skips localhost dev.
 */
function extraPreconnects(): ReactNode {
  const extra = process.env.NEXT_PUBLIC_EXTRA_PRECONNECT;
  if (!extra?.trim()) return null;
  const parts = extra
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((href) => {
    try {
      const u = new URL(href);
      if (!u.protocol.startsWith("http")) return null;
      const origin = u.origin;
      return (
        <link key={origin} rel="preconnect" href={origin} crossOrigin="anonymous" />
      );
    } catch {
      return null;
    }
  });
}

export function ResourceHints() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  const apiHints =
    raw && !raw.includes("localhost")
      ? (() => {
          try {
            const origin = new URL(raw).origin;
            if (!origin.startsWith("http")) return null;
            return (
              <>
                <link rel="dns-prefetch" href={origin} />
                <link rel="preconnect" href={origin} crossOrigin="anonymous" />
              </>
            );
          } catch {
            return null;
          }
        })()
      : null;

  return (
    <>
      {apiHints}
      {/* Material Symbols (deferred) still pull glyphs from gstatic — warm connection early. */}
      <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      {extraPreconnects()}
    </>
  );
}
