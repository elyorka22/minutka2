"use client";

import { useEffect, useMemo, useState } from "react";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { imageUrl } from "../lib/api";
import { alignHeroImagesToLines, normalizeHeroLines } from "../lib/heroTaglines";
import { SafeImage } from "./SafeImage";

/** Sarlavha: serif, editorial uslub */
const heroTitleFont = Playfair_Display({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["700"],
  display: "swap",
});

/** Tavsif: karta izohlari kabi, yengil */
const heroSubFont = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  display: "swap",
});

const ROTATE_MS = 6200;

/** Ikkinchi qator: «yozib kelayotgan» effekt (harflar ketma-ket) */
const SUB_TYPE_MS = 48;
const SUB_TYPE_START_MS = 300;

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

  const [displayIndex, setDisplayIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setDisplayIndex(0);
    setExiting(false);
  }, [slidesKey]);

  useEffect(() => {
    if (slideCount <= 1) {
      setExiting(false);
      setDisplayIndex(0);
    }
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1) return;
    const id = window.setInterval(() => {
      setExiting(true);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [slidesKey, slideCount]);

  function handleSlideAnimEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.animationName !== "fd-home-hero-slide-sync-out") return;
    setExiting(false);
    setDisplayIndex((i) => (i + 1) % slideCount);
  }

  const titleText = titles[displayIndex] ?? "";
  const subText = subs[displayIndex] ?? "";
  const img = slideImages[displayIndex] ?? null;

  const [typedSub, setTypedSub] = useState("");

  useEffect(() => {
    setTypedSub("");
    const full = subText;
    if (!full) return;

    let cancelled = false;
    let tid: number | undefined;

    function delayBeforeNextChar(index: number): number {
      const ch = full[index];
      if (ch === " " || ch === "\u00a0") return Math.round(SUB_TYPE_MS * 0.55);
      if (ch === "." || ch === "," || ch === "!" || ch === "?") return Math.round(SUB_TYPE_MS * 1.35);
      return SUB_TYPE_MS;
    }

    function typeNext(len: number) {
      if (cancelled) return;
      if (len > full.length) return;
      setTypedSub(full.slice(0, len));
      if (len >= full.length) return;
      tid = window.setTimeout(() => typeNext(len + 1), delayBeforeNextChar(len));
    }

    const startId = window.setTimeout(() => typeNext(1), SUB_TYPE_START_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(startId);
      if (tid !== undefined) window.clearTimeout(tid);
    };
  }, [subText]);

  const slideAnimClass = exiting ? "fd-home-hero-promo-slide--out" : "fd-home-hero-promo-slide--in";

  return (
    <section className={`fd-home-hero-tagline-outer${className ? ` ${className}` : ""}`} aria-label="Bosh sahifa sarlavhasi">
      <div className="fd-home-hero-promo-card" role="heading" aria-level={1}>
        <div
          key={displayIndex}
          className={`fd-home-hero-promo-slide-wrap ${slideAnimClass}`}
          onAnimationEnd={handleSlideAnimEnd}
        >
          <div className="fd-home-hero-promo-left">
            <div className={`fd-home-hero-promo-title ${heroTitleFont.className}`}>{titleText}</div>
            <div className={`fd-home-hero-promo-sub ${heroSubFont.className}`}>
              <span className="fd-sr-only">{subText}</span>
              {subText ? (
                <span className="fd-home-hero-promo-sub-type" aria-hidden="true">
                  {typedSub}
                  <span className="fd-home-hero-promo-type-cursor" />
                </span>
              ) : null}
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
                quality={80}
                sizes="(max-width: 520px) 42vw, 220px"
                fallbackClassName="fd-home-hero-promo-img-empty"
                fallbackStyle={{ width: "100%", height: "100%", minHeight: 168 }}
              />
            ) : (
              <div className="fd-home-hero-promo-img-empty" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
