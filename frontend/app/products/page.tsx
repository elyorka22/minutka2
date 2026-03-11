"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SafeImage } from "../../components/SafeImage";

type Product = {
  id: string;
  name: string;
  price: number;
  unit: "dona" | "kg";
  image: string;
  badge?: string;
  category: "Supermarketlar" | "Gazak va ichimliklar" | "Maishiy tovarlar";
};

const demoProducts: Product[] = [
  {
    id: "p-1",
    name: "Suv 1.5L",
    price: 7000,
    unit: "dona",
    image:
      "https://images.unsplash.com/photo-1550507999-2a1d3f0e4c3a?auto=format&fit=crop&w=900&q=60",
    category: "Gazak va ichimliklar",
    badge: "Top",
  },
  {
    id: "p-2",
    name: "Non (issiq)",
    price: 4500,
    unit: "dona",
    image:
      "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=60",
    category: "Supermarketlar",
  },
  {
    id: "p-3",
    name: "Olma",
    price: 18000,
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=60",
    category: "Supermarketlar",
    badge: "Yangi",
  },
  {
    id: "p-4",
    name: "Chips",
    price: 12000,
    unit: "dona",
    image:
      "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=900&q=60",
    category: "Gazak va ichimliklar",
  },
  {
    id: "p-5",
    name: "Idish yuvish geli",
    price: 29000,
    unit: "dona",
    image:
      "https://images.unsplash.com/photo-1583947581924-860bda3c1d6f?auto=format&fit=crop&w=900&q=60",
    category: "Maishiy tovarlar",
  },
  {
    id: "p-6",
    name: "Qog'oz sochiq",
    price: 24000,
    unit: "dona",
    image:
      "https://images.unsplash.com/photo-1583947582886-0f3045d97c7c?auto=format&fit=crop&w=900&q=60",
    category: "Maishiy tovarlar",
  },
];

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<"Barchasi" | Product["category"]>("Barchasi");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return demoProducts.filter((p) => {
      if (category !== "Barchasi" && p.category !== category) return false;
      if (!query) return true;
      return p.name.toLowerCase().includes(query);
    });
  }, [q, category]);

  return (
    <div className="fd-shell">
      <section className="fd-section">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 className="fd-section-title">Mahsulotlar</h1>
          <Link className="fd-link" href="/">
            ← Bosh sahifa
          </Link>
        </div>
        <p className="fd-empty" style={{ marginTop: 8 }}>
          Hozircha bu sahifa demo. Keyingi bosqichda mahsulotlar do‘konlar bo‘yicha real bazadan keladi.
        </p>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <input
            className="fd-home-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mahsulot izlash..."
          />

          <div className="fd-home-chips" style={{ marginTop: 0 }}>
            {(["Barchasi", "Supermarketlar", "Gazak va ichimliklar", "Maishiy tovarlar"] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`fd-chip ${category === c ? "fd-chip--active" : ""}`}
                onClick={() => setCategory(c as any)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="fd-grid fd-grid--mobile-2" style={{ marginTop: 16 }}>
          {filtered.map((p) => (
            <article key={p.id} className="fd-card">
              <SafeImage
                src={p.image}
                alt=""
                className="fd-card-image"
                style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }}
                fallbackStyle={{ height: 140 }}
              />
              <div className="fd-card-body">
                <div className="fd-card-title-row">
                  <h3>{p.name}</h3>
                  {p.badge && <span className="fd-badge">{p.badge}</span>}
                </div>
                <p className="fd-card-desc" style={{ marginBottom: 10 }}>
                  {p.category}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div className="fd-price">
                    {p.price.toLocaleString()} so‘m / {p.unit}
                  </div>
                  <button className="fd-btn fd-btn-primary" type="button">
                    Savatga
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <p className="fd-empty">Hech narsa topilmadi.</p>
          )}
        </div>
      </section>
    </div>
  );
}

