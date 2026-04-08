"use client";

import { useEffect, useMemo, useState } from "react";

const ROTATE_MS = 3800;

function normalizeLines(raw: string[] | undefined, fallback: string): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return [fallback];
  const lines = raw.map((s) => String(s ?? "").trim()).filter(Boolean);
  return lines.length > 0 ? lines : [fallback];
}

function RotatingLine({ lines }: { lines: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [JSON.stringify(lines)]);

  useEffect(() => {
    if (lines.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % lines.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [lines.length]);

  const text = lines[index] ?? "";

  return (
    <span key={index} className="fd-home-hero-line fd-home-hero-line-rotate">
      {text}
    </span>
  );
}

type Props = {
  heroLine1Texts?: string[];
  heroLine2Texts?: string[];
};

export function HomeHeroTagline({ heroLine1Texts, heroLine2Texts }: Props) {
  const line1 = useMemo(() => normalizeLines(heroLine1Texts, "TAOMLAR."), [heroLine1Texts]);
  const line2 = useMemo(() => normalizeLines(heroLine2Texts, "YETKAZILADI."), [heroLine2Texts]);

  return (
    <h1 className="fd-home-hero-tagline">
      <RotatingLine lines={line1} />
      <RotatingLine lines={line2} />
    </h1>
  );
}
