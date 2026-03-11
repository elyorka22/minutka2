import Link from "next/link";
import { api, imageUrl } from "../lib/api";
import { SafeImage } from "../components/SafeImage";

type RestaurantCard = {
  id: string;
  name: string;
  description?: string | null;
  rating?: number | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
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
  const [restaurants, banners] = await Promise.all([
    getRestaurants(),
    getBannersForHome(),
  ]);

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
          <Link href="/products" className="fd-chip">
            Mahsulotlar
          </Link>
          <Link href="/couriers" className="fd-chip">
            Kuryer
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
            title: "Tezkor kuryer",
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
        <h2 className="fd-section-title">Do‘konlardan mahsulotlar</h2>
        <div className="fd-home-store-row">
          <button type="button" className="fd-home-store-pill fd-home-store-pill--green">
            Supermarketlar
          </button>
          <button type="button" className="fd-home-store-pill fd-home-store-pill--orange">
            Gazak va ichimliklar
          </button>
          <button type="button" className="fd-home-store-pill fd-home-store-pill--blue">
            Maishiy tovarlar
          </button>
        </div>
      </section>

      <section className="fd-section">
        <h2 className="fd-section-title">Mashhur restoranlar</h2>
        <div className="fd-grid">
          {restaurants.map((r) => (
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

      <section className="fd-section">
        <h2 className="fd-section-title">Siz buyurtma qilgansiz</h2>
        <p className="fd-empty">
          Bu yerda siz avval buyurtma qilgan taomlar va mahsulotlar paydo bo‘ladi.
        </p>
      </section>
    </div>
  );
}
