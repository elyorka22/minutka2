import Link from "next/link";
import { api, imageUrl } from "../lib/api";
import { SafeImage } from "../components/SafeImage";

export const metadata = {
  title: "Minutka — ovqat yetkazib berish O‘zbekiston bo‘ylab",
  description:
    "Tez ovqat yetkazib berish servis. Restoranlar va do‘konlardan qulay buyurtma berish, shahar bo‘ylab tez yetkazib berish. Minutka bilan hoziroq sinab ko‘ring.",
  openGraph: {
    title: "Minutka — ovqat yetkazib berish O‘zbekiston bo‘ylab",
    description:
      "O‘z shahringizdagi restoranlar va do‘konlardan ovqat buyurtma qiling. Minutka bilan tez yetkazib berish, qulay to‘lov va bir necha daqiqada buyurtma berish.",
  },
};

type RestaurantCard = {
  id: string;
  name: string;
  description?: string | null;
  rating?: number | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  isSupermarket?: boolean | null;
  isFeatured?: boolean | null;
  featuredSortOrder?: number | null;
};

type BannerCard = {
  id: string;
  title: string;
  text?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

async function getRestaurants(): Promise<RestaurantCard[]> {
  const data = await api.getRestaurants();
  if (!Array.isArray(data)) return [];
  return data.map((r: any) => ({
    id: String(r.id),
    name: String(r.name),
    description: r.description ?? null,
    rating: typeof r.rating === "number" ? r.rating : null,
    logoUrl: r.logoUrl ?? null,
    coverUrl: r.coverUrl ?? null,
    isSupermarket: !!r.isSupermarket,
    isFeatured: !!r.isFeatured,
    featuredSortOrder: r.featuredSortOrder ?? null,
  }));
}

async function getFeaturedRestaurants(): Promise<RestaurantCard[]> {
  const data = await api.getFeaturedRestaurants();
  if (!Array.isArray(data)) return [];
  return data.map((r: any) => ({
    id: String(r.id),
    name: String(r.name),
    description: r.description ?? null,
    rating: typeof r.rating === "number" ? r.rating : null,
    logoUrl: r.logoUrl ?? null,
    coverUrl: r.coverUrl ?? null,
    isSupermarket: !!r.isSupermarket,
  }));
}

async function getBannersForHome(): Promise<BannerCard[]> {
  const data = await api.getBanners();
  if (!Array.isArray(data)) return [];
  return data.map((b: any) => ({
    id: String(b.id),
    title: String(b.title),
    text: b.text ?? null,
    imageUrl: b.imageUrl ?? null,
    ctaLabel: b.ctaLabel ?? null,
    ctaHref: b.ctaHref ?? null,
  }));
}

export default async function HomePage() {
  const [restaurants, banners, featuredRestaurants] = await Promise.all([
    getRestaurants(),
    getBannersForHome(),
    getFeaturedRestaurants(),
  ]);

  const supermarkets = restaurants.filter((r) => r.isSupermarket);
  const normalRestaurants = restaurants.filter((r) => !r.isSupermarket);
  const topCarouselRestaurants =
    featuredRestaurants.length > 0
      ? featuredRestaurants
      : normalRestaurants.slice(0, 8);

  return (
    <div className="fd-shell">
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
        {(banners.length ? banners : [
          {
            id: "demo-1",
            title: "Chegirma 30%",
            text: "Sevimli restoranlardan issiq yetkazib berish.",
            ctaLabel: "Aksiyani ko‘rish",
            ctaHref: undefined,
          },
          {
            id: "demo-2",
            title: "Tezkor yetkazib berish",
            text: "Mahsulotlarni yaqin do‘konlardan tez yetkazib beramiz.",
            ctaLabel: undefined,
            ctaHref: undefined,
          },
        ]).map((b, index) => {
          const isPrimary = index === 0;
          const bannerClass = isPrimary ? "fd-banner fd-banner--primary" : "fd-banner fd-banner--secondary";
          const content = (
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
            Top restoranlar
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
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

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
