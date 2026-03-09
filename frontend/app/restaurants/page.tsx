import Link from "next/link";
import { api } from "../../lib/api";

export default async function RestaurantsPage() {
  const data = await api.getRestaurants();
  const restaurants = Array.isArray(data) ? data : [];

  return (
    <div className="fd-shell">
      <section className="fd-section">
        <h1 className="fd-section-title">Все рестораны</h1>
        <div className="fd-grid">
          {restaurants.map((r: any) => (
            <Link key={r.id} href={`/restaurants/${r.id}`} className="fd-card">
              <div className="fd-card-image fd-card-image--placeholder" />
              <div className="fd-card-body">
                <div className="fd-card-title-row">
                  <h3>{r.name}</h3>
                </div>
                {r.description && (
                  <p className="fd-card-desc">{r.description}</p>
                )}
              </div>
            </Link>
          ))}
          {restaurants.length === 0 && (
            <p className="fd-empty">Рестораны пока не подключены.</p>
          )}
        </div>
      </section>
    </div>
  );
}
