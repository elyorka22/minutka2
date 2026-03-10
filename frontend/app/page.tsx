import Link from "next/link";
import { api } from "../lib/api";

type RestaurantCard = {
  id: string;
  name: string;
  description?: string | null;
  rating?: number | null;
};

async function getRestaurants(): Promise<RestaurantCard[]> {
  const data = await api.getRestaurants();
  if (!Array.isArray(data)) return [];
  return data.map((r: any) => ({
    id: String(r.id),
    name: String(r.name),
    description: r.description ?? null,
    rating: typeof r.rating === "number" ? r.rating : null,
  }));
}

export default async function HomePage() {
  const restaurants = await getRestaurants();

  return (
    <div className="fd-shell">
      <section className="fd-hero">
        <div className="fd-hero-content">
          <h1>Eng yaxshi restoranlardan yetkazib berish</h1>
          <p>Issiq ovqatni bir necha daqiqada buyurtma qiling — yoningizdagi restoranlar, karta yoki naqd to‘lov.</p>
          <div className="fd-hero-actions">
            <Link href="/restaurants" className="fd-btn fd-btn-primary">
              Restoran tanlash
            </Link>
          </div>
        </div>
      </section>

      <section className="fd-section">
        <h2 className="fd-section-title">Yaqin atrofdagi restoranlar</h2>
        <div className="fd-grid">
          {restaurants.map((r) => (
            <Link key={r.id} href={`/restaurants/${r.id}`} className="fd-card">
              <div className="fd-card-image fd-card-image--placeholder" />
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
