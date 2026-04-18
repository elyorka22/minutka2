"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => m.Analytics),
  { ssr: false },
);
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

/**
 * Loads after first paint / idle so main-thread work during FCP stays minimal.
 * Web Vitals buffer still covers LCP for Speed Insights.
 */
export function DeferredVercelMetrics() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const enable = () => setShow(true);
    if (typeof window === "undefined") return undefined;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(enable, { timeout: 2000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(enable, 1800);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
