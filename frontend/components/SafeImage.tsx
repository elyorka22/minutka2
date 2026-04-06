"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackClassName?: string;
  fallbackStyle?: React.CSSProperties;
  /** LCP / hero: not lazy-loaded; Next injects preload when true. */
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  /** Optimizer quality 1–100 (banner LCP: ~75; grids: ~78–80). */
  quality?: number;
  fetchPriority?: "high" | "low" | "auto";
};

export function SafeImage({
  src,
  alt = "",
  className,
  style,
  fallbackClassName = "fd-card-image fd-card-image--placeholder",
  fallbackStyle,
  priority = false,
  sizes,
  fill = false,
  width = 500,
  height = 500,
  quality = 78,
  fetchPriority,
}: Props) {
  const [failed, setFailed] = useState(false);
  const normalized = (src || "").trim();
  if (!normalized || failed) {
    return <div className={fallbackClassName} style={fallbackStyle} />;
  }

  const fp = fetchPriority ?? (priority ? "high" : "auto");

  if (fill) {
    return (
      <Image
        src={normalized}
        alt={alt}
        fill
        className={className}
        style={style}
        sizes={sizes ?? "100vw"}
        priority={priority}
        quality={quality}
        fetchPriority={fp}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={normalized}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      sizes={sizes ?? "(max-width: 768px) 100vw, 600px"}
      priority={priority}
      quality={quality}
      fetchPriority={fp}
      placeholder="empty"
      onError={() => setFailed(true)}
    />
  );
}
