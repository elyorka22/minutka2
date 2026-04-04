import { clearAuthTokens, getAccessToken, refreshAccessToken } from "./auth-tokens";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const makeRequest = async (tokenOverride?: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
        ...(tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : {}),
      },
      cache: "no-store",
    });

  let res = await makeRequest();
  if (res.status === 401 && typeof window !== "undefined") {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await makeRequest(refreshed);
    }
  }

  if (res.status === 401) {
    clearAuthTokens();
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.message === "string") message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

async function requestWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const withAuth: RequestInit = {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  return request<T>(path, withAuth);
}

function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return requestWithAuth<T>(path, init);
}

export const adminApi = {
  getOverviewStats: () =>
    adminRequest<{
      restaurants: number;
      users: number;
      totalOrders: number;
      delivered: number;
      cancelled: number;
      admins: number;
    }>("/admin/overview/stats"),
  getOverviewRestaurants: (opts?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (typeof opts?.limit === "number") qs.set("limit", String(opts.limit));
    if (typeof opts?.offset === "number") qs.set("offset", String(opts.offset));
    const query = qs.toString();
    return adminRequest<any[]>(`/admin/overview/restaurants${query ? `?${query}` : ""}`);
  },
  getOverviewUsers: (opts?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (typeof opts?.limit === "number") qs.set("limit", String(opts.limit));
    if (typeof opts?.offset === "number") qs.set("offset", String(opts.offset));
    const query = qs.toString();
    return adminRequest<any[]>(`/admin/overview/users${query ? `?${query}` : ""}`);
  },
  getOverviewRecentOrders: (opts?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (typeof opts?.limit === "number") qs.set("limit", String(opts.limit));
    if (typeof opts?.offset === "number") qs.set("offset", String(opts.offset));
    const query = qs.toString();
    return adminRequest<any[]>(`/admin/overview/recent-orders${query ? `?${query}` : ""}`);
  },
  getRestaurants: () => request<any>("/restaurants"),
  getMyRestaurants: () =>
    requestWithAuth<any[]>("/admin/my-restaurants"),
  getRestaurantWithOrders: (id: string) => request<any>(`/restaurants/${id}`),
  getRestaurantOrders: (
    id: string,
    opts?: { limit?: number; offset?: number; status?: string; signal?: AbortSignal },
  ) => {
    const qs = new URLSearchParams();
    if (typeof opts?.limit === "number") qs.set("limit", String(opts.limit));
    if (typeof opts?.offset === "number") qs.set("offset", String(opts.offset));
    if (opts?.status) qs.set("status", opts.status);
    const query = qs.toString();
    return adminRequest<any[]>(`/restaurants/${id}/orders${query ? `?${query}` : ""}`, {
      ...(opts?.signal ? { signal: opts.signal } : {}),
    });
  },
  getRestaurantOrdersChanges: (
    id: string,
    opts?: { status?: string; since?: string },
  ) => {
    const qs = new URLSearchParams();
    if (opts?.status) qs.set("status", opts.status);
    if (opts?.since) qs.set("since", opts.since);
    const query = qs.toString();
    return adminRequest<{ changed: boolean; lastUpdatedAt: string | null }>(
      `/restaurants/${id}/orders/changes${query ? `?${query}` : ""}`,
    );
  },
  getRestaurantOrdersArchive: (id: string) =>
    adminRequest<any[]>(`/restaurants/${id}/orders/archive`),
  getRestaurantStats: (id: string) =>
    adminRequest<{ activeOrdersCount: number; deliveredOrdersCount: number; totalRevenue: number; platformFeePercent: number; totalPlatformFee: number }>(`/restaurants/${id}/orders/stats`),
  getCourierOrders: (opts?: { limit?: number; offset?: number; status?: string; scope?: "pool" | "mine" }) => {
    const qs = new URLSearchParams();
    if (typeof opts?.limit === "number") qs.set("limit", String(opts.limit));
    if (typeof opts?.offset === "number") qs.set("offset", String(opts.offset));
    if (opts?.status) qs.set("status", opts.status);
    if (opts?.scope) qs.set("scope", opts.scope);
    const query = qs.toString();
    return adminRequest<any[]>(`/courier/orders${query ? `?${query}` : ""}`, { method: "GET" });
  },
  getCourierOrdersChanges: (opts?: { scope?: "pool" | "mine"; since?: string }) => {
    const qs = new URLSearchParams();
    if (opts?.scope) qs.set("scope", opts.scope);
    if (opts?.since) qs.set("since", opts.since);
    const query = qs.toString();
    return adminRequest<{ changed: boolean; lastUpdatedAt: string | null }>(
      `/courier/orders/changes${query ? `?${query}` : ""}`,
      { method: "GET" },
    );
  },
  getCourierDeliveredByDay: (opts?: { days?: number }) => {
    const qs = new URLSearchParams();
    if (typeof opts?.days === "number" && Number.isFinite(opts.days)) qs.set("days", String(opts.days));
    const query = qs.toString();
    return adminRequest<{ days: number; total: number; byDay: Array<{ date: string; count: number }> }>(
      `/courier/stats/delivered-by-day${query ? `?${query}` : ""}`,
      { method: "GET" },
    );
  },
  getCourierSettings: () => adminRequest<{ telegramChatId: string }>(`/courier/settings`),
  updateCourierSettings: (body: { telegramChatId?: string }) =>
    adminRequest<{ telegramChatId: string }>(`/courier/settings`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getRestaurantSettings: (id: string) =>
    adminRequest<{ telegramChatId: string }>(`/restaurants/${id}/settings`),
  updateRestaurantSettings: (id: string, body: { telegramChatId?: string }) =>
    adminRequest<{ telegramChatId: string }>(`/restaurants/${id}/settings`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  takeOrder: (id: string) =>
    adminRequest<any>(`/orders/${id}/take`, {
      method: "POST",
    }),
  updateOrderStatus: (
    id: string,
    status: "NEW" | "ACCEPTED" | "READY" | "ON_THE_WAY" | "DONE" | "CANCELLED",
    cancelReason?: string,
  ) =>
    requestWithAuth<any>(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...(cancelReason ? { cancelReason } : {}) }),
    }),
  updateUserRole: (id: string, role: string) =>
    requestWithAuth<any>(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  deleteUser: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" }),
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
  sendPush: (body: { title: string; message: string; url: string }) =>
    adminRequest<{ ok: boolean; success: number; failed: number }>("/admin/push/send", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getMyPushStatus: () =>
    adminRequest<{ subscribed: boolean; count: number }>("/push/me"),
  createPartnershipApplication: (body: {
    name: string;
    phone: string;
    businessName: string;
    businessType?: string;
    details?: string;
    contactMethod?: string;
  }) =>
    request<{ ok: boolean; id: string }>("/partnership/applications", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getPartnershipApplications: () =>
    adminRequest<
      Array<{
        id: string;
        createdAt: string;
        name: string;
        phone: string;
        businessName: string;
        businessType?: string | null;
        details?: string | null;
        contactMethod?: string | null;
      }>
    >("/admin/partnership-applications"),
  getPushSubscribersCustomers: () =>
    adminRequest<Array<{
      id: string;
      email: string;
      name: string;
      createdAt: string;
      pushSubscriptionsCount: number;
      ordersCount: number;
    }>>("/admin/users/push-subscribers"),
  deleteRestaurant: (id: string) =>
    adminRequest<any>(`/admin/restaurants/${id}`, {
      method: "DELETE",
    }),
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const postUpload = (accessToken: string | null) => {
      const fd = new FormData();
      fd.append("file", file);
      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      return fetch(`${API_BASE}/admin/upload`, {
        method: "POST",
        headers,
        body: fd,
        cache: "no-store",
      });
    };

    let res = await postUpload(getAccessToken());
    if (res.status === 401 && typeof window !== "undefined") {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        res = await postUpload(refreshed);
      }
    }
    if (res.status === 401) {
      clearAuthTokens();
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg =
        typeof err?.message === "string" ? err.message : `Upload failed: ${res.status}`;
      throw new Error(msg);
    }
    return res.json() as Promise<{ url: string }>;
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
      carouselNational?: boolean;
      carouselNationalSort?: number;
      carouselFastFood?: boolean;
      carouselFastFoodSort?: number;
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
    title?: string;
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
      imageUrl?: string | null;
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

  updateMyCredentials: (body: {
    currentPassword: string;
    newEmail?: string;
    newPassword?: string;
  }) =>
    adminRequest<{ ok: true; email: string }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
