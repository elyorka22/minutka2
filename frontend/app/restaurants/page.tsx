import { permanentRedirect } from "next/navigation";

/** Eski `/restaurants` ro‘yxati bosh sahifada; qidiruv va havolalar uchun doimiy yo‘naltirish. */
export default function RestaurantsIndexPage() {
  permanentRedirect("/");
}
