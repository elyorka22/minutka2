"use client";

import { useEffect, useMemo, useState } from "react";
import { imageUrl } from "../lib/api";
import { alignHeroImagesToLines, normalizeHeroLines } from "../lib/heroTaglines";
import { SafeImage } from "./SafeImage";

const ROTATE_MS = 3800;

function RotatingHeroRow({
  lines,
  imageUrls,
}: {
  lines: string[];
  imageUrls: (string | null)[];
}) {
  const [index, setIndex] = useState(0);
  const linesKey = useMemo(() => JSON.stringify(lines), [lines]);

  useEffect(() => {
    setIndex(0);
  }, [linesKey]);

  useEffect(() => {
    if (lines.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % lines.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [linesKey]);

  const text = lines[index] ?? "";
  const img = imageUrls[index] ?? null;

  return (
    <div className="fd-home-hero-tagline-row">
      <div className="fd-home-hero-tagline-text">
        <span className="fd-home-hero-line-wrap">
          <span key={linesKey + String(index)} className="fd-home-hero-line fd-home-hero-line-rotate">
            {text}
          </span>
        </span>
      </div>
      <div className="fd-home-hero-thumb" aria-hidden={!img}>
        {img ? (
          <SafeImage
            src={imageUrl(img)}
            alt=""
            className="fd-home-hero-thumb-img"
            width={112}
            height={112}
            quality={78}
            sizes="56px"
            fallbackStyle={{ width: "100%", height: "100%" }}
          />
        ) : (
          <span className="fd-home-hero-thumb-empty" />
        )}
      </div>
    </div>
  );
}

type Props = {
  heroLine1Texts?: string[];
  heroLine2Texts?: string[];
  heroLine1ImageUrls?: (string | null)[];
  heroLine2ImageUrls?: (string | null)[];
  className?: string;
};

export function HomeHeroTagline({
  heroLine1Texts,
  heroLine2Texts,
  heroLine1ImageUrls,
  heroLine2ImageUrls,
  className,
}: Props) {
  const line1 = useMemo(() => normalizeHeroLines(heroLine1Texts, "TAOMLAR."), [heroLine1Texts]);
  const line2 = useMemo(() => normalizeHeroLines(heroLine2Texts, "YETKAZILADI."), [heroLine2Texts]);
  const img1 = useMemo(() => alignHeroImagesToLines(line1, heroLine1ImageUrls), [line1, heroLine1ImageUrls]);
  const img2 = useMemo(() => alignHeroImagesToLines(line2, heroLine2ImageUrls), [line2, heroLine2ImageUrls]);

  return (
    <section className={`fd-home-hero-tagline-outer${className ? ` ${className}` : ""}`} aria-label="Bosh sahifa sarlavhasi">
      <div className="fd-home-hero-tagline fd-home-hero-tagline--split" role="heading" aria-level={1}>
        <RotatingHeroRow lines={line1} imageUrls={img1} />
        <RotatingHeroRow lines={line2} imageUrls={img2} />
      </div>
    </section>
  );
}
