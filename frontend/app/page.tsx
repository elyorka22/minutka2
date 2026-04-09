import type { Metadata } from "next";
import Link from "next/link";
import { imageUrl } from "../lib/api";
import { type HomepageRestaurant } from "../lib/api-server";
import { getCachedHomepage } from "../lib/homepage-cache";
import { SafeImage } from "../components/SafeImage";
import { HomeExploreCarousel } from "../components/HomeExploreCarousel";

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

  const thumbLcp = createThumbLcpGate();

  return (
    <div className="fd-shell">
      <div className="fd-home-hero-wolt">
        <div className="fd-home-hero-inner">
          {exploreCategories.length > 0 && (
            <div className="fd-home-explore-section fd-home-explore-section--hero-only">
              <HomeExploreCarousel
                categories={exploreCategories}
                ariaLabel="Tezkor kategoriyalar — birinchi qator"
              />
            </div>
          )}
        </div>
      </div>

      <div className="fd-home-body-sheet">
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
                </div>
                {r.description && <p className="fd-card-desc">{r.description}</p>}
              </div>
            </Link>
          ))}
          {restaurants.length === 0 && <p className="fd-empty">Hozircha restoranlar ulanmagan.</p>}
        </div>
      </section>
      </div>
    </div>
  );
}
