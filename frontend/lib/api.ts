export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

/** Mehmon mijozlar uchun brauzer kaliti (`client-*@minutka.local`). */
export function getOrCreateMinutkaClientKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const keyName = "minutka_client_key";
  let existing = window.localStorage.getItem(keyName);
  if (!existing) {
    const uuid =
      window.crypto && "randomUUID" in window.crypto
        ? (window.crypto as Crypto).randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    existing = String(uuid);
    window.localStorage.setItem(keyName, existing);
  }
  return existing;
}

async function pollCreateJobUntilOrderId(
  jobId: string,
  clientKey: string | undefined,
  token: string | null,
): Promise<string> {
  const base = API_BASE.replace(/\/$/, "");
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const qs = new URLSearchParams();
    if (clientKey) qs.set("clientKey", clientKey);
    const q = qs.toString();
    const res = await fetch(
      `${base}/orders/create-job/${encodeURIComponent(jobId)}${q ? `?${q}` : ""}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || `Job status ${res.status}`);
    }
    const j = (await res.json()) as { state: string; orderId: string | null; error: string | null };
    if (j.state === "completed" && j.orderId) return j.orderId;
    if (j.state === "failed") throw new Error(j.error || "Buyurtma yaratilmadi");
    await new Promise((r) => setTimeout(r, 450));
  }
  throw new Error("Buyurtma yaratish vaqti tugadi");
}

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

  /** Bir profil uchun bir marta: `appinstalled` yoki birinchi standalone ochilish. */
  async recordPwaInstall(): Promise<void> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
    try {
      await fetch(`${base}/pwa-install`, { method: "POST", cache: "no-store" });
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
    const clientKey = getOrCreateMinutkaClientKey();
    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...body, clientKey }),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Order failed: ${res.status}`);
    }
    const data = await res.json();
    if (data && data.status === "queued" && typeof data.jobId === "string") {
      const orderId = await pollCreateJobUntilOrderId(data.jobId, clientKey, token);
      return { ...data, id: orderId };
    }
    return data;
  },
};
