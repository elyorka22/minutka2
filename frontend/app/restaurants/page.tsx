import Link from "next/link";
import { api, imageUrl } from "../../lib/api";
import { SafeImage } from "../../components/SafeImage";
import { BackLink } from "../../components/BackLink";

export default async function RestaurantsPage() {
  const data = await api.getRestaurants();
  const restaurants = Array.isArray(data) ? data : [];

  return (
    <div className="fd-shell">
      <BackLink href="/" />
      <section className="fd-section">
        <h1 className="fd-section-title">Barcha restoranlar</h1>
        <div className="fd-grid">
          {restaurants.map((r: any) => (
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
