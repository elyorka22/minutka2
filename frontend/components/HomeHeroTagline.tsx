"use client";

import { useEffect, useMemo, useState } from "react";
import { imageUrl } from "../lib/api";
import { alignHeroImagesToLines, normalizeHeroLines } from "../lib/heroTaglines";
import { SafeImage } from "./SafeImage";

const ROTATE_MS = 3800;

function padToLength(lines: string[], n: number, fallback: string): string[] {
  if (n <= 0) return [fallback];
  const out = lines.slice(0, n);
  const fill = out.length > 0 ? out[out.length - 1]! : fallback;
  while (out.length < n) out.push(fill);
  return out;
}

type Props = {
  heroLine1Texts?: string[];
  heroLine2Texts?: string[];
  /** Bir slyd uchun bitta rasm (1-qator variantlari bilan bir xil tartibda). */
  heroLine1ImageUrls?: (string | null)[];
  className?: string;
};

export function HomeHeroTagline({ heroLine1Texts, heroLine2Texts, heroLine1ImageUrls, className }: Props) {
  const raw1 = useMemo(() => normalizeHeroLines(heroLine1Texts, "TAOMLAR."), [heroLine1Texts]);
  const raw2 = useMemo(() => normalizeHeroLines(heroLine2Texts, "YETKAZILADI."), [heroLine2Texts]);

  const slideCount = useMemo(() => Math.max(raw1.length, raw2.length, 1), [raw1.length, raw2.length]);

  const titles = useMemo(
    () => padToLength(raw1, slideCount, "TAOMLAR."),
    [raw1, slideCount],
  );
  const subs = useMemo(
    () => padToLength(raw2, slideCount, "YETKAZILADI."),
    [raw2, slideCount],
  );

  const slideImages = useMemo(
    () => alignHeroImagesToLines(titles, heroLine1ImageUrls),
    [titles, heroLine1ImageUrls],
  );

  const slidesKey = useMemo(() => JSON.stringify({ titles, subs }), [titles, subs]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slidesKey]);

  useEffect(() => {
    if (slideCount <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slideCount);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [slidesKey, slideCount]);

  const titleText = titles[index] ?? "";
  const subText = subs[index] ?? "";
  const img = slideImages[index] ?? null;

  return (
    <section className={`fd-home-hero-tagline-outer${className ? ` ${className}` : ""}`} aria-label="Bosh sahifa sarlavhasi">
      <div className="fd-home-hero-promo-card" role="heading" aria-level={1}>
        <div className="fd-home-hero-promo-left">
          <div key={slidesKey + "t" + String(index)} className="fd-home-hero-promo-title fd-home-hero-promo-line-anim">
            {titleText}
          </div>
          <div key={slidesKey + "s" + String(index)} className="fd-home-hero-promo-sub fd-home-hero-promo-line-anim">
            {subText}
          </div>
        </div>
        <div className="fd-home-hero-promo-right">
          {img ? (
            <SafeImage
              src={imageUrl(img)}
              alt=""
              className="fd-home-hero-promo-img"
              width={640}
              height={400}
              quality={82}
              sizes="(max-width: 520px) 42vw, 220px"
              fallbackStyle={{ width: "100%", height: "100%", minHeight: 152 }}
            />
          ) : (
            <div className="fd-home-hero-promo-img-empty" aria-hidden />
          )}
        </div>
      </div>
    </section>
  );
}
