const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

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
};
