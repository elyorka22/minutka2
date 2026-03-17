export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

/** Превращает относительный URL картинки (напр. /uploads/xxx) в полный URL бэкенда */
export function imageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = API_BASE.replace(/\/$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export const api = {
  async getRestaurants() {
    try {
      const data = await request<any[]>("/restaurants");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  async getFeaturedRestaurants() {
    try {
      const data = await request<any[]>("/restaurants/featured");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  async getRestaurant(id: string) {
    try {
      return await request<any>(`/restaurants/${id}`);
    } catch {
      return { id, name: "Restoran mavjud emas", dishes: [] };
    }
  },
  async getProducts() {
    try {
      const data = await request<any[]>("/products");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  async getProductCategories() {
    try {
      const data = await request<any[]>("/product-categories");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  async getBanners() {
    try {
      const data = await request<any[]>("/banners");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async recordVisit(): Promise<void> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
    try {
      await fetch(`${base}/visit`, { method: "POST", cache: "no-store" });
    } catch {
      // ignore
    }
  },

  async createOrder(body: {
    restaurantId: string;
    address: { street: string; city: string; label?: string; details?: string; latitude: number; longitude: number };
    items: { dishId: string; quantity: number }[];
    comment?: string;
    paymentMethod: "CARD" | "CASH";
  }): Promise<any> {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Order failed: ${res.status}`);
    }
    return res.json();
  },
};
