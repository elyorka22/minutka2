/**
 * Server component: first-paint hint for LCP banner (original URL; Next/Image still optimizes).
 * Placed at top of home page; browsers pick up preload from document stream.
 */
export function HomePreloadLinks({ href }: { href: string | null | undefined }) {
  const u = (href || "").trim();
  if (!u) return null;
  return <link rel="preload" as="image" href={u} fetchPriority="high" />;
}
