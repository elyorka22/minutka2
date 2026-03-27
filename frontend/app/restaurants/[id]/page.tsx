"use client";

import { useCart } from "../../../components/CartContext";
import { api, imageUrl } from "../../../lib/api";
import { SafeImage } from "../../../components/SafeImage";
import { BackLink } from "../../../components/BackLink";

async function loadRestaurant(id: string) {
  const data = await api.getRestaurant(id);
  return data as any;
}

export default async function RestaurantPage({
  params,
}: { params: { id: string } }) {
  const restaurant = await loadRestaurant(params.id);
  const dishes = Array.isArray(restaurant?.dishes) ? restaurant.dishes : [];

  return <RestaurantPageClient restaurant={restaurant} dishes={dishes} />;
}

function RestaurantPageClient({ restaurant, dishes }: { restaurant: any; dishes: any[] }) {
  const { items, addToCart, changeQuantity } = useCart();
  const isSupermarket = !!restaurant?.isSupermarket;
  const backHref = isSupermarket ? "/supermarkets" : "/restaurants";
  const backLabel = isSupermarket ? "← Do‘konlar" : "← Restoranlar";
  const headerTitle = restaurant?.name ?? (isSupermarket ? "Do‘kon" : "Restoran");
  const sectionTitle = isSupermarket ? "Mahsulotlar" : "Menyu";
  const emptyText = isSupermarket ? "Mahsulotlar hozircha bo‘sh." : "Menyu hozircha bo‘sh.";

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
        <div className="fd-grid fd-grid--2">
          {dishes.map((dish) => {
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
                    fallbackStyle={{ height: 140 }}
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
          {dishes.length === 0 && (
            <p className="fd-empty">{emptyText}</p>
          )}
        </div>
      </section>
    </div>
  );
}
