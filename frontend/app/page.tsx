import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { imageUrl } from "../lib/api";
import {
  type HomepageRestaurant,
  type HomepageBanner,
  type HomepageExploreCategory,
} from "../lib/api-server";
import { getCachedHomepage } from "../lib/homepage-cache";
import { SafeImage } from "../components/SafeImage";
import { HomePreloadLinks } from "../components/HomePreloadLinks";

/** ISR: HTML кэшируется на CDN (Vercel edge и т.д.) — повторные визиты без холодного /homepage. */
export const revalidate = 60;

/** Static metadata — без await к API (быстрее заголовок ответа). */
export const metadata: Metadata = {
  title: "Minutka — ovqat va oziq-ovqat mahsulotlarini yetkazib berish platformasi",
  description:
    "Tez ovqat yetkazib berish servis. Restoranlar va do‘konlardan qulay buyurtma berish, shahar bo‘ylab tez yetkazib berish. Minutka bilan hoziroq sinab ko‘ring.",
  openGraph: {
    title: "Minutka — ovqat va oziq-ovqat mahsulotlarini yetkazib berish platformasi",
    description:
      "O‘z shahringizdagi restoranlar va do‘konlardan ovqat buyurtma qiling. Minutka bilan tez yetkazib berish, qulay to‘lov va bir necha daqiqada buyurtma berish.",
    images: [{ url: "/web-app-manifest-512x512.png" }],
  },
};

function mapRestaurant(r: HomepageRestaurant) {
  return {
    id: String(r.id),
    name: String(r.name),
    description: r.description ?? null,
    rating: typeof r.rating === "number" ? r.rating : null,
    logoUrl: r.logoUrl ?? null,
    coverUrl: r.coverUrl ?? null,
    isSupermarket: !!r.isSupermarket,
    isFeatured: !!r.isFeatured,
    featuredSortOrder: r.featuredSortOrder ?? null,
  };
}

function mapBanner(b: HomepageBanner) {
  return {
    id: String(b.id),
    title: b.title?.trim() ? String(b.title) : null,
    text: b.text ?? null,
    imageUrl: b.imageUrl ?? null,
    ctaLabel: b.ctaLabel ?? null,
    ctaHref: b.ctaHref ?? null,
  };
}

function createThumbLcpGate(hasHeroImage: boolean) {
  let canGive = !hasHeroImage;
  return (isFirstInSection: boolean) => {
    if (!canGive || !isFirstInSection) return false;
    canGive = false;
    return true;
  };
}

export default async function HomePage() {
  const home = await getCachedHomepage();
  const restaurants = (home.restaurants || []).map(mapRestaurant);
  const banners = (home.banners || []).map(mapBanner);
  const topCategories = home.topCategories || [];
  const exploreCategories: HomepageExploreCategory[] = home.exploreCategories ?? [];

  const normalRestaurants = restaurants.filter((r) => !r.isSupermarket);

  const displayBanners =
    banners.length > 0
      ? banners
      : [
          {
            id: "demo-1",
            title: "Chegirma 30%",
            text: "Sevimli restoranlardan issiq yetkazib berish.",
            ctaLabel: "Aksiyani ko‘rish",
            ctaHref: undefined as string | undefined,
            imageUrl: null as string | null,
          },
          {
            id: "demo-2",
            title: "Tezkor yetkazib berish",
            text: "Mahsulotlarni yaqin do‘konlardan tez yetkazib beramiz.",
            ctaLabel: undefined as string | undefined,
            ctaHref: undefined as string | undefined,
            imageUrl: null as string | null,
          },
        ];

  const heroHref =
    displayBanners[0]?.imageUrl ? imageUrl(displayBanners[0].imageUrl) : "";
  const hasHeroImage = Boolean(heroHref);
  const thumbLcp = createThumbLcpGate(hasHeroImage);

  return (
    <>
      <HomePreloadLinks href={heroHref || null} />
      <div className="fd-shell">
        <section className="fd-home-top">
          <div className="fd-home-search">
            <input
              className="fd-home-search-input"
              placeholder="Taom, restoran yoki mahsulot izlash"
            />
          </div>
        </section>

        <section className="fd-home-banners">
          {displayBanners.map((b, index) => {
            const isPrimary = index === 0;
            const imgSrc = b.imageUrl ? imageUrl(b.imageUrl) : "";
            const bannerClass = [
              "fd-banner",
              imgSrc ? "fd-banner--photo" : isPrimary ? "fd-banner--primary" : "fd-banner--secondary",
            ].join(" ");
            const textBlock = (
              <>
                {b.title ? <div className="fd-banner-title">{b.title}</div> : null}
                {b.text && <p className="fd-banner-text">{b.text}</p>}
                {b.ctaLabel && (
                  <button type="button" className="fd-btn fd-btn-primary fd-banner-btn">
                    {b.ctaLabel}
                  </button>
                )}
              </>
            );
            const content = imgSrc ? (
              <>
                <div className="fd-banner-media">
                  <Image
                    src={imgSrc}
                    alt={b.title ?? ""}
                    className="fd-banner-img"
                    fill
                    priority={isPrimary}
                    fetchPriority={isPrimary ? "high" : "low"}
                    loading={isPrimary ? undefined : "lazy"}
                    decoding={isPrimary ? "sync" : "async"}
                    sizes={
                      isPrimary
                        ? "(max-width: 768px) min(100vw, 600px), 600px"
                        : "(max-width: 768px) min(100vw, 480px), 480px"
                    }
                    quality={isPrimary ? 70 : 76}
                  />
                  <div className="fd-banner-scrim" aria-hidden="true" />
                </div>
                <div className="fd-banner-body">{textBlock}</div>
              </>
            ) : (
              textBlock
            );
            return (
              <article key={b.id} className={bannerClass}>
                {content}
              </article>
            );
          })}
        </section>

        {exploreCategories.length > 0 && (
          <section
            className="fd-section fd-home-explore-section"
            aria-label="Tezkor kategoriyalar"
          >
            <div className="fd-home-explore-scroll">
              {exploreCategories.map((c, index) => {
                const q = (c.searchQuery?.trim() || c.name).trim();
                const href = `/search?q=${encodeURIComponent(q)}`;
                return (
                  <Link key={c.id} href={href} className="fd-home-explore-item">
                    <div className="fd-home-explore-circle">
                      {c.imageUrl ? (
                        <SafeImage
                          src={imageUrl(c.imageUrl)}
                          alt=""
                          className="fd-home-explore-circle-img"
                          width={144}
                          height={144}
                          quality={76}
                          priority={thumbLcp(index === 0)}
                          fallbackStyle={{ height: 72 }}
                          sizes="72px"
                        />
                      ) : (
                        <span className="fd-home-explore-placeholder" aria-hidden>
                          {c.name.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <span className="fd-home-explore-label">{c.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {topCategories.length > 0 && (
          <section className="fd-section">
            <h2 className="fd-section-title">
              <Link href="/supermarkets" style={{ color: "inherit", textDecoration: "none" }}>
                Mahsulot toifalari
              </Link>
            </h2>
            <div className="fd-home-stores">
              {topCategories.map((c, index) => (
                <Link
                  key={c.id}
                  href="/supermarkets"
                  className="fd-card fd-product-cat-card"
                >
                  <div className="fd-product-cat-image-wrap">
                    <SafeImage
                      src={c.imageUrl ? imageUrl(c.imageUrl) : ""}
                      alt={c.name}
                      className="fd-product-cat-image"
                      width={120}
                      height={120}
                      quality={76}
                      priority={thumbLcp(index === 0)}
                      fallbackStyle={{ height: 40 }}
                      sizes="120px"
                    />
                  </div>
                  <div className="fd-card-body" style={{ padding: "8px 10px" }}>
                    <span className="fd-card-desc" style={{ margin: 0 }}>
                      {c.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="fd-section">
          <h2 className="fd-section-title">
            <Link href="/restaurants" style={{ color: "inherit", textDecoration: "none" }}>
              Barcha restoranlar
            </Link>
          </h2>
          <div className="fd-grid fd-grid--barcha-home">
            {normalRestaurants.map((r, index) => (
              <Link key={r.id} href={`/restaurants/${r.id}`} className="fd-card">
                <SafeImage
                  src={(r.coverUrl || r.logoUrl) ? imageUrl(r.coverUrl || r.logoUrl) : ""}
                  alt=""
                  className="fd-card-image"
                  width={400}
                  height={300}
                  quality={76}
                  priority={thumbLcp(index === 0)}
                  style={{ width: "100%", height: "auto", objectFit: "cover", aspectRatio: "4/3" }}
                  fallbackStyle={{ height: 140 }}
                  sizes="(max-width: 640px) 50vw, 400px"
                />
                <div className="fd-card-body">
                  <div className="fd-card-title-row">
                    <h3>{r.name}</h3>
                    {r.rating != null && (
                      <span className="fd-badge">★ {r.rating.toFixed(1)}</span>
                    )}
                  </div>
                  {r.description && (
                    <p className="fd-card-desc">{r.description}</p>
                  )}
                </div>
              </Link>
            ))}
            {restaurants.length === 0 && (
              <p className="fd-empty">Hozircha restoranlar ulanmagan.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
