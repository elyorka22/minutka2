/**
 * Preconnect/dns-prefetch to API origin so banner and card images start earlier (mobile LCP).
 * Skips localhost dev.
 */
export function ResourceHints() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw || raw.includes("localhost")) return null;
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
}
