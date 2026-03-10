"use client";

import { useCart } from "../../../components/CartContext";
import { api, imageUrl } from "../../../lib/api";

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
  const { addToCart } = useCart();

  return (
    <div className="fd-shell fd-restaurant">
      <header className="fd-restaurant-header">
        {(restaurant?.coverUrl || restaurant?.logoUrl) && (
          <img
            src={imageUrl(restaurant.coverUrl || restaurant.logoUrl)}
            alt=""
            style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: "var(--radius-md)" }}
          />
        )}
        <div>
          <h1>{restaurant?.name ?? "Restoran"}</h1>
          {restaurant?.description && (
            <p className="fd-restaurant-desc">{restaurant.description}</p>
          )}
        </div>
      </header>

      <section className="fd-section">
        <h2 className="fd-section-title">Menyu</h2>
        <div className="fd-grid">
          {dishes.map((dish) => (
            <article key={dish.id} className="fd-card fd-card--dish">
              <div className="fd-card-body">
                <h3>{dish.name}</h3>
                {dish.description && (
                  <p className="fd-card-desc">{dish.description}</p>
                )}
                <div className="fd-dish-footer">
                  <span className="fd-price">{Number(dish.price).toFixed(0)} so&apos;m</span>
                  <button
                    type="button"
                    className="fd-btn fd-btn-primary"
                    onClick={() =>
                      addToCart({
                        id: String(dish.id),
                        name: String(dish.name),
                        description: dish.description ?? null,
                        price: Number(dish.price),
                        imageUrl: dish.imageUrl ?? null,
                      })
                    }
                  >
                    Savatga qo‘shish
                  </button>
                </div>
              </div>
            </article>
          ))}
          {dishes.length === 0 && (
            <p className="fd-empty">Menyu hozircha bo‘sh.</p>
          )}
        </div>
      </section>
    </div>
  );
}
