import { api } from "../../../lib/api";
import { RestaurantPageClient } from "./RestaurantPageClient";

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
