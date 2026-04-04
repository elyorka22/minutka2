import Link from "next/link";
import { imageUrl } from "../../lib/api";
import { fetchRestaurantsList } from "../../lib/api-server";
import { SafeImage } from "../../components/SafeImage";
import { BackLink } from "../../components/BackLink";

export const metadata = {
  title: "Minutka — Restoranlar va kafelardan ovqat yetkazib berish xizmati",
  description:
    "O‘z shahringizdagi mashhur restoranlar bir joyda. Menyudan tanlang, tez ovqat yetkazib berish bilan buyurtma bering va Minutka orqali qulay xizmatdan foydalaning.",
  openGraph: {
    title: "Minutka — Restoranlar va kafelardan ovqat yetkazib berish xizmati",
    description:
      "Restoranlar menyusidan taom tanlab, tez yetkazib berish bilan buyurtma bering. Minutka servisi O‘zbekiston shaharlarida qulay ovqat yetkazib berish taklif qiladi.",
  },
};

export default async function RestaurantsPage() {
  const data = await fetchRestaurantsList();
  const all = Array.isArray(data) ? data : [];
  const restaurants = all.filter((r: any) => !r.isSupermarket);

  return (
    <div className="fd-shell fd-page-listing">
      <BackLink href="/" />
      <section className="fd-section">
        <h1 className="fd-section-title">Barcha restoranlar</h1>
        <div className="fd-grid fd-grid--2">
          {restaurants.map((r: any) => (
            <Link key={r.id} href={`/restaurants/${r.id}`} className="fd-card fd-card--restaurant-tile">
              <SafeImage
                src={(r.coverUrl || r.logoUrl) ? imageUrl(r.coverUrl || r.logoUrl) : ""}
                alt=""
                className="fd-card-image"
                style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }}
                fallbackStyle={{ aspectRatio: "1/1" }}
              />
              <div className="fd-card-body">
                <div className="fd-card-title-row">
                  <h3>{r.name}</h3>
                </div>
                {r.description ? (
                  <p className="fd-card-desc">{r.description}</p>
                ) : null}
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
