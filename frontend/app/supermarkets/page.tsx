import Link from "next/link";
import { imageUrl } from "../../lib/api";
import { fetchRestaurantsList } from "../../lib/api-server";
import { SafeImage } from "../../components/SafeImage";
import { BackLink } from "../../components/BackLink";

export const metadata = {
  title: "Do‘konlar va supermarketlar — Minutka tez yetkazib berish",
  description:
    "Mahsulotlarni do‘konlar va supermarketlardan onlayn buyurtma qiling. Tez yetkazib berish, qulay tanlov va Minutka bilan ishonchli servis O‘zbekiston bo‘ylab.",
  openGraph: {
    title: "Do‘konlar va supermarketlar — Minutka",
    description:
      "Shahringizdagi do‘konlar va supermarketlardan mahsulotlarga buyurtma berish. Minutka bilan tez yetkazib berish va qulay onlayn xarid tajribasini sinab ko‘ring.",
  },
};

export default async function SupermarketsPage() {
  const data = await fetchRestaurantsList();
  const all = Array.isArray(data) ? data : [];
  const supermarkets = all.filter((r: any) => !!r.isSupermarket);

  return (
    <div className="fd-shell fd-page-listing">
      <BackLink href="/" />
      <section className="fd-section">
        <h1 className="fd-section-title">Do‘konlar (supermarketlar)</h1>
        <div className="fd-grid fd-grid--2">
          {supermarkets.map((s: any) => (
            <Link
              key={s.id}
              href={`/restaurants/${s.id}`}
              className="fd-card"
            >
              <SafeImage
                src={(s.coverUrl || s.logoUrl) ? imageUrl(s.coverUrl || s.logoUrl) : ""}
                alt=""
                className="fd-card-image"
                style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }}
                fallbackStyle={{ height: 160 }}
              />
              <div className="fd-card-body">
                <div className="fd-card-title-row">
                  <h3>{s.name}</h3>
                </div>
                {s.description && (
                  <p className="fd-card-desc">{s.description}</p>
                )}
              </div>
            </Link>
          ))}
          {supermarkets.length === 0 && (
            <p className="fd-empty">Hozircha do‘konlar qo‘shilmagan.</p>
          )}
        </div>
      </section>
    </div>
  );
}
