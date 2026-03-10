const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
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

export const adminApi = {
  getRestaurants: () => request<any>("/restaurants"),
  getRestaurantWithOrders: (id: string) => request<any>(`/restaurants/${id}`),
  getRestaurantOrders: (id: string) =>
    request<any>(`/restaurants/${id}/orders`, { headers: getAuthHeaders() }),
  updateOrderStatus: (id: string, status: string) =>
    request<any>(`/orders/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    }),
  updateUserRole: (id: string, role: string) =>
    request<any>(`/admin/users/${id}/role`, {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ role }),
    }),
};
