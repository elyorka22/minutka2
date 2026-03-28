"use client";

import { useMemo, useState } from "react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackClassName?: string;
  fallbackStyle?: React.CSSProperties;
  /** LCP / hero: eager load + high fetch priority */
  priority?: boolean;
  sizes?: string;
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
}: Props) {
  const [failed, setFailed] = useState(false);

  const normalized = useMemo(() => {
    const s = (src || "").trim();
    return s;
  }, [src]);

  if (!normalized || failed) {
    return <div className={fallbackClassName} style={fallbackStyle} />;
  }

  return (
    <img
      src={normalized}
      alt={alt}
      className={className}
      style={style}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(true)}
    />
  );
}

