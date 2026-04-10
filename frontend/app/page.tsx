import type { Metadata } from "next";
import Link from "next/link";
import { imageUrl } from "../lib/api";
import { type HomepageRestaurant } from "../lib/api-server";
import { getCachedHomepage } from "../lib/homepage-cache";
import { SafeImage } from "../components/SafeImage";
import { HomeExploreCarousel } from "../components/HomeExploreCarousel";
import { HomePromoBanner } from "../components/HomePromoBanner";

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

function createThumbLcpGate() {
  let canGive = true;
  return (isFirstInSection: boolean) => {
    if (!canGive || !isFirstInSection) return false;
    canGive = false;
    return true;
  };
}

export default async function HomePage() {
  const home = await getCachedHomepage();
  const restaurants = (home.restaurants || []).map(mapRestaurant);
  const topCategories = home.topCategories || [];
  const exploreCategories = home.exploreCategories ?? [];

  const normalRestaurants = restaurants.filter((r) => !r.isSupermarket);

  const bannersSorted = [...(home.banners || [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const promoBanner =
    bannersSorted.find(
      (b) => (b.imageUrl && String(b.imageUrl).trim()) || (b.title && String(b.title).trim()),
    ) ??
    bannersSorted[0] ??
    null;

  const promoFallbackRestaurant =
    normalRestaurants.find((r) => r.coverUrl || r.logoUrl) ?? normalRestaurants[0] ?? null;

  const thumbLcp = createThumbLcpGate();

  return (
    <div className="fd-shell">
      <nav className="fd-home-vv-subnav" aria-label="Tezkor bo‘limlar">
        <Link href="/supermarkets" className="fd-home-vv-subnav-link">
          Do‘konlar
        </Link>
        <Link href="/promocodes" className="fd-home-vv-subnav-link fd-home-vv-subnav-link--accent">
          Aksiyalar
        </Link>
        <Link href="/restaurants" className="fd-home-vv-subnav-link">
          Restoranlar
        </Link>
      </nav>

      <HomePromoBanner banner={promoBanner} fallbackRestaurant={promoFallbackRestaurant} />

      {exploreCategories.length > 0 && (
        <div className="fd-home-vv-stories fd-home-vv-stories--explore-panel">
          <HomeExploreCarousel
            variant="featureCards"
            categories={exploreCategories}
            ariaLabel="Tezkor kategoriyalar"
            titleMain="Bugun nimani buyurtma qilasiz?"
          />
        </div>
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
              <Link key={c.id} href="/supermarkets" className="fd-card fd-product-cat-card">
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
            <Link
              key={r.id}
              href={`/restaurants/${r.id}`}
              className={`fd-card fd-card--barcha-banner fd-barcha-banner--${index % 2 === 0 ? "a" : "b"}`}
            >
              <div className="fd-barcha-banner-shell">
                <div className="fd-barcha-banner-img-wrap" aria-hidden>
                  <SafeImage
                    src={(r.coverUrl || r.logoUrl) ? imageUrl(r.coverUrl || r.logoUrl) : ""}
                    alt=""
                    className="fd-barcha-banner-img"
                    width={960}
                    height={540}
                    quality={78}
                    priority={thumbLcp(index === 0)}
                    sizes="(max-width: 900px) 100vw, 900px"
                    fallbackClassName="fd-barcha-banner-img fd-barcha-banner-img--ph"
                    fallbackStyle={{ width: "100%", height: "100%", minHeight: 168 }}
                  />
                </div>
                <div className="fd-barcha-banner-scrim" aria-hidden />
                <div className="fd-barcha-banner-text">
                  <h3 className="fd-barcha-banner-title">{r.name}</h3>
                  {r.rating != null && r.rating > 0 && (
                    <span className="fd-barcha-banner-rating">
                      {Math.round((Math.min(5, Math.max(0, r.rating)) / 5) * 100)}%
                    </span>
                  )}
                  {r.description ? (
                    <p className="fd-barcha-banner-desc">{r.description}</p>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
          {restaurants.length === 0 && <p className="fd-empty">Hozircha restoranlar ulanmagan.</p>}
        </div>
      </section>
    </div>
  );
}

