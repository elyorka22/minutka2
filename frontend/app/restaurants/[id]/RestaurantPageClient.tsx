"use client";

import { useMemo, useState } from "react";
import { useCart } from "../../../components/CartContext";
import { imageUrl } from "../../../lib/api";
import { SafeImage } from "../../../components/SafeImage";
import { BackLink } from "../../../components/BackLink";

type CategoryRow = { id: string; name: string; sortOrder?: number };

export function RestaurantPageClient({
  restaurant,
  dishes,
}: {
  restaurant: any;
  dishes: any[];
}) {
  const { items, addToCart, changeQuantity } = useCart();
  const isSupermarket = !!restaurant?.isSupermarket;
  const backHref = isSupermarket ? "/supermarkets" : "/restaurants";
  const backLabel = isSupermarket ? "← Do‘konlar" : "← Restoranlar";
  const headerTitle = restaurant?.name ?? (isSupermarket ? "Do‘kon" : "Restoran");
  const sectionTitle = isSupermarket ? "Mahsulotlar" : "Menyu";
  const emptyText = isSupermarket ? "Mahsulotlar hozircha bo‘sh." : "Menyu hozircha bo‘sh.";

  const categories: CategoryRow[] = useMemo(() => {
    const raw = restaurant?.categories;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((c: any) => ({
        id: String(c.id),
        name: String(c.name ?? ""),
        sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : 0,
      }))
      .filter((c) => c.id && c.name)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [restaurant?.categories]);

  const hasCategoryMenu = useMemo(() => {
    if (categories.length === 0) return false;
    const catIds = new Set(categories.map((c) => c.id));
    return dishes.some((d) => d?.categoryId && catIds.has(String(d.categoryId)));
  }, [categories, dishes]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | "all">("all");

  const filteredDishes = useMemo(() => {
    if (!hasCategoryMenu || selectedCategoryId === "all") return dishes;
    return dishes.filter((d) => String(d.categoryId ?? "") === String(selectedCategoryId));
  }, [dishes, hasCategoryMenu, selectedCategoryId]);

  return (
    <div className="fd-shell fd-restaurant">
      <BackLink href={backHref}>{backLabel}</BackLink>
      <header className="fd-restaurant-header" style={{ textAlign: "center" }}>
        <h1>{headerTitle}</h1>
        {restaurant?.description && (
          <p className="fd-restaurant-desc">{restaurant.description}</p>
        )}
      </header>

      <section className="fd-section">
        <h2 className="fd-section-title">{sectionTitle}</h2>

        {hasCategoryMenu && (
          <div
            className="fd-restaurant-category-carousel"
            role="tablist"
            aria-label="Kategoriyalar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategoryId === "all"}
              className={`fd-chip ${selectedCategoryId === "all" ? "fd-chip--active" : ""}`}
              onClick={() => setSelectedCategoryId("all")}
            >
              Barchasi
            </button>
            {categories.map((c) => {
              const hasDish = dishes.some((d) => String(d?.categoryId ?? "") === c.id);
              if (!hasDish) return null;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategoryId === c.id}
                  className={`fd-chip ${selectedCategoryId === c.id ? "fd-chip--active" : ""}`}
                  onClick={() => setSelectedCategoryId(c.id)}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="fd-grid fd-grid--2">
          {filteredDishes.map((dish) => {
            const id = String(dish.id);
            const quantity =
              items.find((i) => i.dish.id === id)?.quantity ?? 0;

            return (
              <article key={id} className="fd-card fd-card--dish">
                <div className="fd-card-media">
                  <SafeImage
                    src={dish.imageUrl ? imageUrl(dish.imageUrl) : ""}
                    alt=""
                    className="fd-card-image"
                    style={{ width: "100%", height: "100%" }}
                    fallbackStyle={{ height: 72 }}
                  />
                  {quantity === 0 ? (
                    <button
                      type="button"
                      className="fd-card-plus-btn"
                      onClick={() =>
                        addToCart(
                          {
                            id,
                            name: String(dish.name),
                            description: dish.description ?? null,
                            price: Number(dish.price),
                            imageUrl: dish.imageUrl ?? null,
                          },
                          String(restaurant.id),
                        )
                      }
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
                  <h3>{dish.name}</h3>
                  {dish.description && (
                    <p className="fd-card-desc">{dish.description}</p>
                  )}
                  <div className="fd-dish-footer">
                    <span className="fd-price">
                      {Number(dish.price).toFixed(0)} so&apos;m
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
          {filteredDishes.length === 0 && dishes.length > 0 && hasCategoryMenu && (
            <p className="fd-empty">Bu kategoriyada taom yo‘q.</p>
          )}
          {dishes.length === 0 && (
            <p className="fd-empty">{emptyText}</p>
          )}
        </div>
      </section>
    </div>
  );
}
