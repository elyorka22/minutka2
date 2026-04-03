import { fetchRestaurant } from "../../../lib/api-server";
import { RestaurantPageClient } from "./RestaurantPageClient";

// Cache (ISR) for a restaurant page per `id`.
// This reduces "every navigation refetches menu" behavior.
export const revalidate = 30;

async function loadRestaurant(id: string) {
  const data = await fetchRestaurant(id);
  return data as any;
}

export default async function RestaurantPage({
  params,
}: { params: { id: string } }) {
  const restaurant = await loadRestaurant(params.id);
  const dishes = Array.isArray(restaurant?.dishes) ? restaurant.dishes : [];

  return <RestaurantPageClient restaurant={restaurant} dishes={dishes} />;
}
