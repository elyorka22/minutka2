"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeHeroLines } from "../lib/heroTaglines";

const ROTATE_MS = 3800;

function RotatingLine({ lines }: { lines: string[] }) {
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

  return (
    <span className="fd-home-hero-line-wrap">
      <span key={linesKey + String(index)} className="fd-home-hero-line fd-home-hero-line-rotate">
        {text}
      </span>
    </span>
  );
}

type Props = {
  heroLine1Texts?: string[];
  heroLine2Texts?: string[];
  className?: string;
};

export function HomeHeroTagline({ heroLine1Texts, heroLine2Texts, className }: Props) {
  const line1 = useMemo(() => normalizeHeroLines(heroLine1Texts, "TAOMLAR."), [heroLine1Texts]);
  const line2 = useMemo(() => normalizeHeroLines(heroLine2Texts, "YETKAZILADI."), [heroLine2Texts]);

  return (
    <h1 className={`fd-home-hero-tagline${className ? ` ${className}` : ""}`}>
      <RotatingLine lines={line1} />
      <RotatingLine lines={line2} />
    </h1>
  );
}
