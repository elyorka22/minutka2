"use client";

import Link from "next/link";
import { imageUrl } from "../lib/api";
import { type HomepageExploreCategory } from "../lib/api-server";
import { SafeImage } from "./SafeImage";

function categoryHref(c: HomepageExploreCategory): string {
  const q = c.searchQuery?.trim();
  if (q) return `/search?q=${encodeURIComponent(q)}`;
  return "/supermarkets";
}

type Props = {
  categories: HomepageExploreCategory[];
  /** Bo‘sh bo‘lsa butun blok chiqarilmaydi */
  ariaLabel: string;
  /** Birinchi qator ostidagi ikkinchi skroll uchun qo‘shimcha klass */
  classNameScroll?: string;
  /** «Stories»: doira + ostida sarlavha (VkusVill uslubi) */
  variant?: "default" | "stories";
};

export function HomeExploreCarousel({
  categories,
  ariaLabel,
  classNameScroll,
  variant = "default",
}: Props) {
  if (categories.length === 0) return null;

  const scrollClass = [
    "fd-home-explore-scroll",
    variant === "stories" ? "fd-home-explore-scroll--stories" : "",
    classNameScroll,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={scrollClass} aria-label={ariaLabel}>
      {categories.map((c) => {
        const href = categoryHref(c);
        return (
          <Link
            key={c.id}
            href={href}
            className={
              variant === "stories"
                ? "fd-home-explore-item fd-home-explore-item--stories"
                : "fd-home-explore-item"
            }
          >
            <div
              className={
                variant === "stories"
                  ? "fd-home-explore-tile fd-home-explore-tile--stories"
                  : "fd-home-explore-tile"
              }
            >
              {c.imageUrl ? (
                <SafeImage
                  src={imageUrl(c.imageUrl)}
                  alt=""
                  className="fd-home-explore-tile-img"
                  width={160}
                  height={160}
                  quality={76}
                  priority={false}
                  fallbackStyle={{ height: 80 }}
                  sizes="72px"
                />
              ) : (
                <span className="fd-home-explore-placeholder" aria-hidden>
                  {c.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>
            {variant === "stories" && (
              <span className="fd-home-explore-label fd-home-explore-label--stories">{c.name}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
