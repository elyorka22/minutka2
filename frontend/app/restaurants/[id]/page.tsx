"use client";

import { useCart } from "../../../components/CartContext";
import { api } from "../../../lib/api";

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
        <div>
          <h1>{restaurant?.name ?? "Ресторан"}</h1>
          {restaurant?.description && (
            <p className="fd-restaurant-desc">{restaurant.description}</p>
          )}
        </div>
      </header>

      <section className="fd-section">
        <h2 className="fd-section-title">Меню</h2>
        <div className="fd-grid">
          {dishes.map((dish) => (
            <article key={dish.id} className="fd-card fd-card--dish">
              <div className="fd-card-body">
                <h3>{dish.name}</h3>
                {dish.description && (
                  <p className="fd-card-desc">{dish.description}</p>
                )}
                <div className="fd-dish-footer">
                  <span className="fd-price">{Number(dish.price).toFixed(0)} ₽</span>
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
                    В корзину
                  </button>
                </div>
              </div>
            </article>
          ))}
          {dishes.length === 0 && (
            <p className="fd-empty">Меню пока пустое.</p>
          )}
        </div>
      </section>
    </div>
  );
}
