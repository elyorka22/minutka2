/** Chust — xarita markazi: 40°59′52″ shimoli, 71°14′25″ sharqi */
export const CHUST_DEFAULT_COORDS = { lat: 40.997778, lng: 71.240278 };

/** Toshkent markaz (taxminiy) */
const TASHKENT_CENTER = { lat: 41.311151, lng: 69.279737 };

/**
 * Shahar nomi bo‘yicha xarita markazi (taxminiy). Noma’lum shahar — Chust.
 */
export function getApproxCityCenter(city: string): { lat: number; lng: number } {
  const k = city.trim().toLowerCase();
  if (!k) return CHUST_DEFAULT_COORDS;
  if (k.includes("chust")) return CHUST_DEFAULT_COORDS;
  if (k.includes("toshkent") || k.includes("tashkent") || k.includes("тошкент")) return TASHKENT_CENTER;
  return CHUST_DEFAULT_COORDS;
}
