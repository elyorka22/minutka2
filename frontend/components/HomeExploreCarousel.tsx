import Link from "next/link";
import { imageUrl } from "../lib/api";
import { type HomepageExploreCategory } from "../lib/api-server";
import { SafeImage } from "./SafeImage";

type Props = {
  categories: HomepageExploreCategory[];
  /** Bo‘sh bo‘lsa butun blok chiqarilmaydi */
  ariaLabel: string;
  /** Birinchi qator ostidagi ikkinchi skroll uchun qo‘shimcha klass */
  classNameScroll?: string;
};

export function HomeExploreCarousel({ categories, ariaLabel, classNameScroll }: Props) {
  if (categories.length === 0) return null;

  const scrollClass = ["fd-home-explore-scroll", classNameScroll].filter(Boolean).join(" ");

  return (
    <div className={scrollClass} aria-label={ariaLabel}>
      {categories.map((c) => {
        const q = (c.searchQuery?.trim() || c.name).trim();
        const href = `/search?q=${encodeURIComponent(q)}`;
        return (
          <Link key={c.id} href={href} className="fd-home-explore-item" aria-label={c.name}>
            <div className="fd-home-explore-tile">
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
                  sizes="80px"
                />
              ) : (
                <span className="fd-home-explore-placeholder" aria-hidden>
                  {c.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
