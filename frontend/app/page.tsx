import Link from "next/link";
import { imageUrl } from "../lib/api";
import { fetchHomepageStable, type HomepageRestaurant, type HomepageBanner } from "../lib/api-server";
import { SafeImage } from "../components/SafeImage";

export const metadata = {
  title: "Minutka — ovqat va oziq-ovqat mahsulotlarini yetkazib berish platformasi",
  description:
    "Tez ovqat yetkazib berish servis. Restoranlar va do‘konlardan qulay buyurtma berish, shahar bo‘ylab tez yetkazib berish. Minutka bilan hoziroq sinab ko‘ring.",
  openGraph: {
    title: "Minutka — ovqat va oziq-ovqat mahsulotlarini yetkazib berish platformasi",
    description:
      "O‘z shahringizdagi restoranlar va do‘konlardan ovqat buyurtma qiling. Minutka bilan tez yetkazib berish, qulay to‘lov va bir necha daqiqada buyurtma berish.",
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
    title: String(b.title),
    text: b.text ?? null,
    imageUrl: b.imageUrl ?? null,
    ctaLabel: b.ctaLabel ?? null,
    ctaHref: b.ctaHref ?? null,
  };
}

export default async function HomePage() {
  const home = await fetchHomepageStable();
  const restaurants = (home.restaurants || []).map(mapRestaurant);
  const featuredRestaurants = (home.featured || []).map(mapRestaurant);
  const banners = (home.banners || []).map(mapBanner);
  const topCategories = home.topCategories || [];

  const supermarkets = restaurants.filter((r) => r.isSupermarket);
  const normalRestaurants = restaurants.filter((r) => !r.isSupermarket);
  const topCarouselRestaurants =
    featuredRestaurants.length > 0
      ? featuredRestaurants
      : normalRestaurants.slice(0, 8);
  const fastFoodCarouselRestaurants =
    normalRestaurants.length > 8
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

  const firstHeroSrc = displayBanners[0]?.imageUrl ? imageUrl(displayBanners[0].imageUrl) : "";

  return (
    <div className="fd-shell">
      {firstHeroSrc ? (
        <head>
          <link rel="preload" as="image" href={firstHeroSrc} />
        </head>
      ) : null}

      <section className="fd-home-top">
        <div className="fd-home-search">
          <input
            className="fd-home-search-input"
            placeholder="Taom, restoran yoki mahsulot izlash"
          />
        </div>

        <div className="fd-home-chips">
          <Link href="/restaurants" className="fd-chip fd-chip--active">
            Restoranlar
          </Link>
          <Link href="/supermarkets" className="fd-chip">
            Do‘konlar
          </Link>
        </div>
      </section>

      <section className="fd-home-banners">
        {displayBanners.map((b, index) => {
          const isPrimary = index === 0;
          const bannerClass = isPrimary ? "fd-banner fd-banner--primary" : "fd-banner fd-banner--secondary";
          const imgSrc = b.imageUrl ? imageUrl(b.imageUrl) : "";
          const textBlock = (
            <>
              <div className="fd-banner-title">{b.title}</div>
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
                <SafeImage
                  src={imgSrc}
                  alt=""
                  className="fd-banner-img"
                  priority={isPrimary}
                  sizes="(max-width: 768px) 100vw, 720px"
                />
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
            {topCarouselRestaurants.map((r) => (
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
            {fastFoodCarouselRestaurants.map((r) => (
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
            {supermarkets.map((s) => (
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
            {topCategories.map((c) => (
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
        <div className="fd-grid">
          {normalRestaurants.map((r) => (
            <Link key={r.id} href={`/restaurants/${r.id}`} className="fd-card">
              <SafeImage
                src={(r.coverUrl || r.logoUrl) ? imageUrl(r.coverUrl || r.logoUrl) : ""}
                alt=""
                className="fd-card-image"
                style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }}
                fallbackStyle={{ height: 160 }}
                sizes="(max-width: 640px) 50vw, 320px"
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
  );
}
