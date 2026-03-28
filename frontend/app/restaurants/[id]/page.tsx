import { fetchRestaurant } from "../../../lib/api-server";
import { RestaurantPageClient } from "./RestaurantPageClient";

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
