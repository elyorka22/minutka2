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
  /** Hero / LCP: eager + high priority (Next.js adds preload). */
  priority?: boolean;
  sizes?: string;
  /** Fill positioned parent (banners, dish cards). */
  fill?: boolean;
  /** Fixed dimensions when fill is false (optimizer max width aligns with backend 500px). */
  width?: number;
  height?: number;
  quality?: number;
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
  quality = 80,
}: Props) {
  const [failed, setFailed] = useState(false);
  const normalized = (src || "").trim();
  if (!normalized || failed) {
    return <div className={fallbackClassName} style={fallbackStyle} />;
  }

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
      sizes={sizes ?? "(max-width: 768px) 100vw, 500px"}
      priority={priority}
      quality={quality}
      placeholder="empty"
      onError={() => setFailed(true)}
    />
  );
}
