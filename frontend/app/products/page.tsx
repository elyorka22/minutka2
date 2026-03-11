"use client";

import { useEffect, useState } from "react";
import { SafeImage } from "../../components/SafeImage";
import { BackLink } from "../../components/BackLink";
import { api, imageUrl } from "../../lib/api";

type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  imageUrl?: string | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const data = await api.getProducts();
        if (!active) return;
        const next: Product[] = (Array.isArray(data) ? data : []).map((p: any) => ({
          id: String(p.id),
          name: String(p.name),
          price: Number(p.price),
          unit: String(p.unit ?? "dona"),
          imageUrl: p.imageUrl ?? null,
        }));
        setProducts(next);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="fd-shell">
      <section className="fd-section">
        <BackLink href="/" />
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 className="fd-section-title">Mahsulotlar</h1>
        </div>
        {loading && <p className="fd-empty" style={{ marginTop: 8 }}>Yuklanmoqda...</p>}

        <div className="fd-grid fd-grid--2" style={{ marginTop: 16 }}>
          {products.map((p) => (
            <article key={p.id} className="fd-card fd-card--product">
              <div className="fd-card-media">
                <SafeImage
                  src={p.imageUrl ? imageUrl(p.imageUrl) : ""}
                  alt=""
                  className="fd-card-image"
                  style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover" }}
                  fallbackStyle={{ height: 140 }}
                />
                <button type="button" className="fd-card-plus-btn">
                  <span className="material-symbols-rounded">add</span>
                </button>
              </div>
              <div className="fd-card-body">
                <div className="fd-card-title-row">
                  <h3>{p.name}</h3>
                </div>
                <div className="fd-price">
                  {p.price.toLocaleString()} so‘m / {p.unit}
                </div>
              </div>
            </article>
          ))}

          {!loading && products.length === 0 && (
            <p className="fd-empty">Mahsulotlar topilmadi. Restoran menyulariga taom qo‘shing.</p>
          )}
        </div>
      </section>
    </div>
  );
}

