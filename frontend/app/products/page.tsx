"use client";

import { useEffect, useState } from "react";
import { SafeImage } from "../../components/SafeImage";
import { BackLink } from "../../components/BackLink";
import { api, imageUrl } from "../../lib/api";
import { useCart } from "../../components/CartContext";
import type { Dish } from "../../lib/types";

type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  imageUrl?: string | null;
};

type ProductCategory = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);
  const { items, addToCart, changeQuantity } = useCart();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const [productsData, categoriesData] = await Promise.all([
          api.getProducts(),
          api.getProductCategories(),
        ]);
        if (!active) return;
        const next: Product[] = (Array.isArray(productsData) ? productsData : []).map((p: any) => ({
          id: String(p.id),
          name: String(p.name),
          price: Number(p.price),
          unit: String(p.unit ?? "dona"),
          imageUrl: p.imageUrl ?? null,
        }));
        setProducts(next);
        const cats: ProductCategory[] = (Array.isArray(categoriesData) ? categoriesData : [])
          .filter((c: any) => c.isActive !== false)
          .map((c: any) => ({
            id: String(c.id),
            name: String(c.name),
            imageUrl: c.imageUrl ?? null,
          }));
        setCategories(cats);
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

        {categories.length > 0 && (
          <div className="fd-grid fd-grid--3" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="fd-card fd-product-cat-card"
              onClick={() => setActiveCategoryId("all")}
            >
              <div className="fd-product-cat-image-wrap">
                <span className="fd-product-cat-name">Barchasi</span>
              </div>
              <span className="fd-product-cat-name">
                Hammasi
              </span>
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`fd-card fd-product-cat-card ${
                  activeCategoryId === c.id ? "fd-product-cat-card--active" : ""
                }`}
                onClick={() => setActiveCategoryId(c.id)}
              >
                <div className="fd-product-cat-image-wrap">
                  <SafeImage
                    src={c.imageUrl ? imageUrl(c.imageUrl) : ""}
                    alt=""
                    className="fd-product-cat-image"
                    style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }}
                    fallbackStyle={{ height: 40 }}
                  />
                </div>
                <span className="fd-product-cat-name">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="fd-grid fd-grid--2" style={{ marginTop: 16 }}>
          {products.map((p) => {
            const id = p.id;
            const quantity =
              items.find((i) => i.dish.id === id)?.quantity ?? 0;

            const asDish: Dish = {
              id,
              name: p.name,
              description: null,
              price: p.price,
              imageUrl: p.imageUrl ?? null,
            };

            return (
              <article key={id} className="fd-card fd-card--product">
                <div className="fd-card-media">
                  <SafeImage
                    src={p.imageUrl ? imageUrl(p.imageUrl) : ""}
                    alt=""
                    className="fd-card-image"
                    style={{ width: "100%", aspectRatio: "4/5", objectFit: "contain" }}
                    fallbackStyle={{ height: 140 }}
                  />
                  {quantity === 0 ? (
                    <button
                      type="button"
                      className="fd-card-plus-btn"
                      onClick={() => addToCart(asDish)}
                    >
                      <span className="material-symbols-rounded">add</span>
                    </button>
                  ) : (
                    <div className="fd-qty fd-qty--overlay">
                      <button
                        type="button"
                        className="fd-qty-btn"
                        onClick={() => changeQuantity(id, quantity - 1)}
                      >
                        −
                      </button>
                      <span className="fd-qty-value">{quantity}</span>
                      <button
                        type="button"
                        className="fd-qty-btn"
                        onClick={() => changeQuantity(id, quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  )}
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
            );
          })}

          {!loading && products.length === 0 && (
            <p className="fd-empty">Mahsulotlar topilmadi. Restoran menyulariga taom qo‘shing.</p>
          )}
        </div>
      </section>
    </div>
  );
}

