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

function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.headers || {}) },
  });
}

export const adminApi = {
  getRestaurants: () => request<any>("/restaurants"),
  getMyRestaurants: () =>
    request<any[]>("/admin/my-restaurants", { headers: getAuthHeaders() }),
  getRestaurantWithOrders: (id: string) => request<any>(`/restaurants/${id}`),
  getRestaurantOrders: (id: string) =>
    adminRequest<any[]>(`/restaurants/${id}/orders`),
  getRestaurantOrdersArchive: (id: string) =>
    adminRequest<any[]>(`/restaurants/${id}/orders/archive`),
  getRestaurantStats: (id: string) =>
    adminRequest<{ activeOrdersCount: number; deliveredOrdersCount: number; totalRevenue: number; platformFeePercent: number; totalPlatformFee: number }>(`/restaurants/${id}/orders/stats`),
  updateOrderStatus: (id: string, status: string) =>
    request<any>(`/orders/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    }),
  updateUserRole: (id: string, role: string) =>
    request<any>(`/admin/users/${id}/role`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    }),
  createRestaurant: (body: {
    name: string;
    description?: string;
    address?: string;
    logoUrl?: string;
    coverUrl?: string;
    deliveryFee?: number;
    minOrderTotal?: number;
    deliveryRadiusM?: number;
    isSupermarket?: boolean;
    platformFeePercent?: number;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
  }) =>
    adminRequest<any>("/admin/restaurants", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getRestaurantFull: (id: string) =>
    adminRequest<any>(`/admin/restaurants/${id}/full`),
  addRestaurantAdmin: (restaurantId: string, email: string) =>
    adminRequest<{ ok: boolean }>(`/admin/restaurants/${restaurantId}/admins`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  getVisitStatsAdmin: () =>
    adminRequest<{
      byDay: Array<{ date: string; count: number }>;
      byHour: Array<{ hour: number; count: number }>;
      total: number;
    }>("/admin/stats/visits"),
  getRestaurantStatsAdmin: () =>
    adminRequest<{
      deliveredLast7Days: { count: number; totalAmount: number };
      topDishesByAmount: Array<{ dishName: string; restaurantName: string; totalAmount: number; totalQuantity: number }>;
      topDishesByQuantity: Array<{ dishName: string; restaurantName: string; totalAmount: number; totalQuantity: number }>;
      restaurantBalances: Array<{ restaurantId: string; restaurantName: string; amountOwed: number }>;
      ordersByDayOfWeek: Array<{ day: number; count: number }>;
      ordersByHour: Array<{ hour: number; count: number }>;
    }>("/admin/stats/restaurants"),
  clearRestaurantPlatformFee: (restaurantId: string) =>
    adminRequest<{ ok: boolean }>(`/admin/restaurants/${restaurantId}/clear-platform-fee`, {
      method: "POST",
    }),
  deleteRestaurant: (id: string) =>
    adminRequest<any>(`/admin/restaurants/${id}`, {
      method: "DELETE",
    }),
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    const res = await fetch(`${API_BASE}/admin/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed: ${res.status}`);
    }
    return res.json();
  },
  updateRestaurant: (
    id: string,
    body: {
      name?: string;
      description?: string;
      address?: string;
      logoUrl?: string;
      coverUrl?: string;
      deliveryFee?: number;
      minOrderTotal?: number;
      deliveryRadiusM?: number;
      isFeatured?: boolean;
      featuredSortOrder?: number;
      platformFeePercent?: number;
    }
  ) =>
    adminRequest<any>(`/admin/restaurants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createCategory: (restaurantId: string, body: { name: string; sortOrder?: number }) =>
    adminRequest<any>(`/admin/restaurants/${restaurantId}/categories`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteCategory: (restaurantId: string, categoryId: string) =>
    adminRequest<any>(`/admin/restaurants/${restaurantId}/categories/${categoryId}`, {
      method: "DELETE",
    }),
  createDish: (
    restaurantId: string,
    body: {
      name: string;
      description?: string;
      price: number;
      categoryId?: string;
      imageUrl?: string;
    }
  ) =>
    adminRequest<any>(`/admin/restaurants/${restaurantId}/dishes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteDish: (restaurantId: string, dishId: string) =>
    adminRequest<any>(`/admin/restaurants/${restaurantId}/dishes/${dishId}`, {
      method: "DELETE",
    }),
  createProduct: (body: {
    name: string;
    description?: string;
    price: number;
    unit?: string;
    imageUrl?: string;
    categoryId?: string;
  }) =>
    adminRequest<any>("/admin/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteProduct: (id: string) =>
    adminRequest<any>(`/admin/products/${id}`, {
      method: "DELETE",
    }),
  getProductCategories: () =>
    adminRequest<any>("/admin/product-categories", {
      method: "GET",
    }),
  createProductCategory: (body: {
    name: string;
    imageUrl?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) =>
    adminRequest<any>("/admin/product-categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateProductCategory: (
    id: string,
    body: {
      name?: string;
      imageUrl?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) =>
    adminRequest<any>(`/admin/product-categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteProductCategory: (id: string) =>
    adminRequest<any>(`/admin/product-categories/${id}`, {
      method: "DELETE",
    }),
  getBanners: () =>
    adminRequest<any>("/admin/banners", {
      method: "GET",
    }),
  createBanner: (body: {
    title: string;
    text?: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaHref?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) =>
    adminRequest<any>("/admin/banners", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateBanner: (
    id: string,
    body: {
      title?: string;
      text?: string;
      imageUrl?: string;
      ctaLabel?: string;
      ctaHref?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) =>
    adminRequest<any>(`/admin/banners/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteBanner: (id: string) =>
    adminRequest<any>(`/admin/banners/${id}`, {
      method: "DELETE",
    }),
};
