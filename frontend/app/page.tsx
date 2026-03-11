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

export default async function HomePage() {
  const restaurants = await getRestaurants();

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
        <article className="fd-banner fd-banner--primary">
          <div className="fd-banner-title">Chegirma 30%</div>
          <p className="fd-banner-text">Sevimli restoranlardan issiq yetkazib berish.</p>
          <button type="button" className="fd-btn fd-btn-primary fd-banner-btn">
            Aksiyani ko‘rish
          </button>
        </article>
        <article className="fd-banner fd-banner--secondary">
          <div className="fd-banner-title">Tezkor kuryer</div>
          <p className="fd-banner-text">Mahsulotlarni yaqin do‘konlardan tez yetkazib beramiz.</p>
        </article>
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
