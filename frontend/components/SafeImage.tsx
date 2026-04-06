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
  /** LCP / hero: eager, high fetchPriority, Next preload. */
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  /** Optimizer quality 1–100 (thumb ~76–78; hero ~75). */
  quality?: number;
  fetchPriority?: "high" | "low" | "auto";
};

const DEFAULT_THUMB_SIZES = "(max-width: 768px) 50vw, 400px";

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
  width = 400,
  height = 400,
  quality = 76,
  fetchPriority,
}: Props) {
  const [failed, setFailed] = useState(false);
  const normalized = (src || "").trim();
  if (!normalized || failed) {
    return <div className={fallbackClassName} style={fallbackStyle} />;
  }

  const fp = fetchPriority ?? (priority ? "high" : "auto");
  const loading = priority ? "eager" : "lazy";
  /** async decode avoids blocking main thread (better LCP/INP vs sync on hero). */
  const decoding = "async";

  if (fill) {
    return (
      <Image
        src={normalized}
        alt={alt}
        fill
        className={className}
        style={style}
        sizes={sizes ?? DEFAULT_THUMB_SIZES}
        priority={priority}
        loading={loading}
        decoding={decoding}
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
      sizes={sizes ?? DEFAULT_THUMB_SIZES}
      priority={priority}
      loading={loading}
      decoding={decoding}
      quality={quality}
      fetchPriority={fp}
      placeholder="empty"
      onError={() => setFailed(true)}
    />
  );
}
