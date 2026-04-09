export type TabId =
  | "stats"
  | "users"
  | "restaurants"
  | "supermarkets"
  | "restaurant-stats"
  | "visits"
  | "applications"
  | "settings"
  | "push"
  | "telegram";

export type AdminTab = {
  id: TabId;
  label: string;
};

export const ADMIN_TABS: AdminTab[] = [
  { id: "stats", label: "Statistika" },
  { id: "users", label: "Foydalanuvchilar" },
  { id: "restaurants", label: "Restoranlar" },
  { id: "supermarkets", label: "Supermarketlar" },
  { id: "restaurant-stats", label: "Statistika restoranlar" },
  { id: "visits", label: "Tashrifchilar" },
  { id: "applications", label: "Arizalar" },
  { id: "push", label: "Push xabar yuborish" },
  { id: "telegram", label: "Telegram" },
  { id: "settings", label: "Sozlamalar" },
];

export type AdminUiMessage = {
  kind: "success" | "error" | "info";
  text: string;
};
