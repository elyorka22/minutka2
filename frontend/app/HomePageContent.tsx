import Image from "next/image";
import Link from "next/link";
import { imageUrl } from "../lib/api";
import {
  buildCarouselsFromList,
  type HomepageRestaurant,
  type HomepageBanner,
} from "../lib/api-server";
import { getCachedHomepage } from "../lib/homepage-cache";
import { SafeImage } from "../components/SafeImage";
import { HomePreloadLinks } from "../components/HomePreloadLinks";

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

/** One high-priority thumb when there is no hero banner image (new LCP candidate). */
function createThumbLcpGate(hasHeroImage: boolean) {
  let canGive = !hasHeroImage;
  return (isFirstInSection: boolean) => {
    if (!canGive || !isFirstInSection) return false;
    canGive = false;
    return true;
  };
}

export async function HomePageContent() {
  const home = await getCachedHomepage();
  const restaurants = (home.restaurants || []).map(mapRestaurant);
  const featuredRestaurants = (home.featured || []).map(mapRestaurant);
  const banners = (home.banners || []).map(mapBanner);
  const topCategories = home.topCategories || [];

  const supermarkets = restaurants.filter((r) => r.isSupermarket);
  const normalRestaurants = restaurants.filter((r) => !r.isSupermarket);

  const hasNationalCarousel = Array.isArray(home.nationalCarousel);
  const hasFastFoodCarousel = Array.isArray(home.fastFoodCarousel);
  const builtFromList =
    !hasNationalCarousel || !hasFastFoodCarousel
      ? buildCarouselsFromList(home.restaurants ?? [])
      : null;

  const topCarouselRestaurants = hasNationalCarousel
    ? (home.nationalCarousel ?? []).map(mapRestaurant)
    : builtFromList
      ? builtFromList.nationalCarousel.map(mapRestaurant)
      : featuredRestaurants.length > 0
        ? featuredRestaurants
        : normalRestaurants.slice(0, 8);

  const fastFoodCarouselRestaurants = hasFastFoodCarousel
    ? (home.fastFoodCarousel ?? []).map(mapRestaurant)
    : builtFromList
      ? builtFromList.fastFoodCarousel.map(mapRestaurant)
      : normalRestaurants.length > 8
        ? normalRestaurants.slice(8, 16)
        : normalRestaurants.slice(0, 8);

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

      <section className="fd-section">
        <h2 className="fd-section-title">
          <Link href="/restaurants" style={{ color: "inherit", textDecoration: "none" }}>
            Milliy taomlar
          </Link>
        </h2>
        {topCarouselRestaurants.length > 0 ? (
          <div className="fd-home-stores">
            {topCarouselRestaurants.map((r, index) => (
              <Link
                key={r.id}
                href={`/restaurants/${r.id}`}
                className="fd-card fd-product-cat-card"
              >
                <div className="fd-product-cat-image-wrap">
                  <SafeImage
                    src={(r.coverUrl || r.logoUrl) ? imageUrl(r.coverUrl || r.logoUrl) : ""}
                    alt=""
                    className="fd-product-cat-image"
                    width={120}
                    height={120}
                    quality={76}
                    priority={thumbLcp(index === 0)}
                    fallbackStyle={{ height: 40 }}
                    sizes="120px"
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="fd-empty fd-checkout-meta">
            Restoranlar yo‘q. Admin panelda restoranlar qo‘shing va «Top karuselda» belgilang.
          </p>
        )}
      </section>

      <section className="fd-section">
        <h2 className="fd-section-title">
          <Link href="/restaurants" style={{ color: "inherit", textDecoration: "none" }}>
            Fast food
          </Link>
        </h2>
        {fastFoodCarouselRestaurants.length > 0 ? (
          <div className="fd-home-stores">
            {fastFoodCarouselRestaurants.map((r, index) => (
              <Link
                key={`fast-${r.id}`}
                href={`/restaurants/${r.id}`}
                className="fd-card fd-product-cat-card"
              >
                <div className="fd-product-cat-image-wrap">
                  <SafeImage
                    src={(r.coverUrl || r.logoUrl) ? imageUrl(r.coverUrl || r.logoUrl) : ""}
                    alt=""
                    className="fd-product-cat-image"
                    width={120}
                    height={120}
                    quality={76}
                    priority={thumbLcp(index === 0)}
                    fallbackStyle={{ height: 40 }}
                    sizes="120px"
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="fd-empty fd-checkout-meta">
            Restoranlar yo‘q. Admin panelda restoranlar qo‘shing.
          </p>
        )}
      </section>

      <section className="fd-section">
        <h2 className="fd-section-title">
          <Link href="/supermarkets" style={{ color: "inherit", textDecoration: "none" }}>
            Do‘konlardan mahsulotlar
          </Link>
        </h2>
        {supermarkets.length > 0 && (
          <div className="fd-home-stores">
            {supermarkets.map((s, index) => (
              <Link
                key={s.id}
                href={`/restaurants/${s.id}`}
                className="fd-card fd-product-cat-card"
              >
                <div className="fd-product-cat-image-wrap">
                  <SafeImage
                    src={(s.coverUrl || s.logoUrl) ? imageUrl(s.coverUrl || s.logoUrl) : ""}
                    alt=""
                    className="fd-product-cat-image"
                    width={120}
                    height={120}
                    quality={76}
                    priority={thumbLcp(index === 0)}
                    fallbackStyle={{ height: 40 }}
                    sizes="120px"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

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
    </>
  );
}
