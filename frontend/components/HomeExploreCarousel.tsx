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
  /** «Stories»: doira kartochkalari; «featureCards»: oq panel, sarlavha, rangli kartalar */
  variant?: "default" | "stories" | "featureCards";
  /** variant featureCards: kichik qizil/sariq chiziq ustidagi matn */
  titleAccent?: string;
  /** variant featureCards: asosiy sarlavha */
  titleMain?: string;
};

export function HomeExploreCarousel({
  categories,
  ariaLabel,
  classNameScroll,
  variant = "default",
  titleAccent,
  titleMain,
}: Props) {
  if (categories.length === 0) return null;

  if (variant === "featureCards") {
    const accent = titleAccent ?? "Mashhur yo‘nalishlar";
    const main = titleMain ?? "Bugun nimani buyurtma qilasiz?";
    const scrollClass = ["fd-home-explore-scroll", "fd-home-explore-scroll--feature-cards", classNameScroll]
      .filter(Boolean)
      .join(" ");
    return (
      <section className="fd-home-explore-panel" aria-labelledby="fd-home-explore-heading">
        <div className="fd-home-explore-panel__head">
          <p className="fd-home-explore-panel__eyebrow">{accent}</p>
          <h2 id="fd-home-explore-heading" className="fd-home-explore-panel__title">
            {main}
          </h2>
        </div>
        <div className="fd-home-explore-panel__shell">
          <div className={scrollClass}>
            {categories.map((c, index) => {
              const href = categoryHref(c);
              const tone = index % 3;
              return (
                <Link
                  key={c.id}
                  href={href}
                  className={`fd-home-explore-fcard fd-home-explore-fcard--t${tone}`}
                >
                  <div className="fd-home-explore-fcard__media">
                    {c.imageUrl ? (
                      <SafeImage
                        src={imageUrl(c.imageUrl)}
                        alt=""
                        className="fd-home-explore-fcard__img"
                        width={200}
                        height={200}
                        quality={78}
                        priority={index === 0}
                        fallbackStyle={{ width: "80%", height: 80 }}
                        sizes="(max-width: 480px) 38vw, 168px"
                      />
                    ) : (
                      <span className="fd-home-explore-fcard__ph" aria-hidden>
                        {c.name.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="fd-home-explore-fcard__name">{c.name}</div>
                  <span className="fd-home-explore-fcard__pill">Tanlash</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

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
        const itemClassName =
          variant === "stories"
            ? "fd-home-explore-item fd-home-explore-item--stories"
            : "fd-home-explore-item";
        const tileClassName =
          variant === "stories"
            ? "fd-home-explore-tile fd-home-explore-tile--stories"
            : "fd-home-explore-tile";
        const content = (
          <div className={tileClassName}>
            {c.imageUrl ? (
              <SafeImage
                src={imageUrl(c.imageUrl)}
                alt={c.name}
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
        );

        if (variant === "stories") {
          return (
            <div key={c.id} className={itemClassName} aria-hidden>
              {content}
            </div>
          );
        }

        const href = categoryHref(c);
        return (
          <Link key={c.id} href={href} className={itemClassName}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
