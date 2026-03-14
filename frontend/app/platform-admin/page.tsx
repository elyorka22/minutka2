"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi } from "../../lib/adminApi";
import { imageUrl } from "../../lib/api";
type TabId =
  | "stats"
  | "users"
  | "restaurants"
  | "supermarkets"
  | "restaurant-stats"
  | "visits"
  | "settings";

export default function PlatformAdminPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("stats");
  const [tabsOpen, setTabsOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [createFee, setCreateFee] = useState("");
  const [createPlatformFeePercent, setCreatePlatformFeePercent] = useState("10");
  const [createAdminEmail, setCreateAdminEmail] = useState("");
  const [createAdminPassword, setCreateAdminPassword] = useState("");
  const [createAdminName, setCreateAdminName] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createImageUploading, setCreateImageUploading] = useState(false);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productUnit, setProductUnit] = useState("dona");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [productError, setProductError] = useState<string | null>(null);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [productCategoryName, setProductCategoryName] = useState("");
  const [productCategorySort, setProductCategorySort] = useState("");
  const [productCategorySubmitting, setProductCategorySubmitting] = useState(false);
  const [productCategoryImageUrl, setProductCategoryImageUrl] = useState("");
  const [productCategoryImageUploading, setProductCategoryImageUploading] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [bannerCtaLabel, setBannerCtaLabel] = useState("");
  const [bannerCtaHref, setBannerCtaHref] = useState("");
  const [bannerSortOrder, setBannerSortOrder] = useState("");
  const [bannerSubmitting, setBannerSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [addAdminEmails, setAddAdminEmails] = useState<Record<string, string>>({});
  const [addAdminSubmitting, setAddAdminSubmitting] = useState<Record<string, boolean>>({});
  const [restaurantStats, setRestaurantStats] = useState<{
    deliveredLast7Days: { count: number; totalAmount: number };
    topDishesByAmount: Array<{ dishName: string; restaurantName: string; totalAmount: number; totalQuantity: number }>;
    topDishesByQuantity: Array<{ dishName: string; restaurantName: string; totalAmount: number; totalQuantity: number }>;
    restaurantBalances: Array<{ restaurantId: string; restaurantName: string; amountOwed: number }>;
    ordersByDayOfWeek: Array<{ day: number; count: number }>;
    ordersByHour: Array<{ hour: number; count: number }>;
  } | null>(null);
  const [restaurantStatsLoading, setRestaurantStatsLoading] = useState(false);
  const [visitStats, setVisitStats] = useState<{
    byDay: Array<{ date: string; count: number }>;
    byHour: Array<{ hour: number; count: number }>;
    total: number;
  } | null>(null);
  const [visitStatsLoading, setVisitStatsLoading] = useState(false);
  const router = useRouter();

  async function handleUploadCreateImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCreateImageUploading(true);
    try {
      const { url } = await adminApi.uploadImage(file);
      setCreateImageUrl(url);
    } catch (err: any) {
      setCreateError(err?.message ?? "Yuklashda xatolik");
    } finally {
      setCreateImageUploading(false);
    }
  }

  async function handleUploadProductImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProductImageUrl(""); // очистим предыдущий URL перед загрузкой
    setProductError(null);
    try {
      const { url } = await adminApi.uploadImage(file);
      setProductImageUrl(url);
    } catch (err: any) {
      setProductError(err?.message ?? "Yuklashda xatolik");
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const overview = await fetchOverview();
        if (!active) return;
        setData(overview);
        setBanners(overview.banners ?? []);
        setProductCategories(overview.productCategories ?? []);
      } catch (err: any) {
        if (!active) return;
        setError(err.message ?? "Yuklashda xatolik");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "restaurant-stats") return;
    let active = true;
    setRestaurantStatsLoading(true);
    adminApi
      .getRestaurantStatsAdmin()
      .then((res) => {
        if (active) setRestaurantStats(res);
      })
      .catch(() => {
        if (active) setRestaurantStats(null);
      })
      .finally(() => {
        if (active) setRestaurantStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "visits") return;
    let active = true;
    setVisitStatsLoading(true);
    adminApi
      .getVisitStatsAdmin()
      .then((res) => {
        if (active) setVisitStats(res);
      })
      .catch(() => {
        if (active) setVisitStats(null);
      })
      .finally(() => {
        if (active) setVisitStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab]);

  async function fetchOverview() {
    const res = await fetch(
      (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000") +
        "/admin/overview",
      {
        headers:
          typeof window === "undefined"
            ? {}
            : {
                Authorization:
                  `Bearer ${window.localStorage.getItem("token") ?? ""}`,
              },
      },
    );

    if (res.status === 401 || res.status === 403) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("token");
      }
      router.push("/login?next=/platform-admin");
      throw new Error("Unauthorized");
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg =
        (body?.message && (typeof body.message === "string" ? body.message : body.message[0])) ||
        "Server xatosi";
      throw new Error(errMsg);
    }
    return body as any;
  }

  function getStats() {
    const restaurants = data?.restaurants ?? [];
    const users = data?.users ?? [];
    const orders = data?.recentOrders ?? [];
    const totalOrders = orders.length;
    const delivered = orders.filter((o: any) => o.status === "DELIVERED").length;
    const cancelled = orders.filter((o: any) => o.status === "CANCELLED").length;
    const admins = users.filter(
      (u: any) => u.role === "PLATFORM_ADMIN" || u.role === "RESTAURANT_ADMIN",
    ).length;
    return {
      restaurants: restaurants.length,
      users: users.length,
      totalOrders,
      delivered,
      cancelled,
      admins,
    };
  }

  async function changeUserRole(id: string, role: string) {
    try {
      const updated = await adminApi.updateUserRole(id, role);
      setData((prev: any) =>
        prev
          ? {
              ...prev,
              users: prev.users.map((u: any) =>
                u.id === id ? { ...u, role: updated.role } : u,
              ),
            }
          : prev,
      );
    } catch (err: any) {
      setError(err.message ?? "Rol yangilashda xatolik");
    }
  }

  async function createRestaurantCommon(e: React.FormEvent, isSupermarket: boolean) {
    e.preventDefault();
    setCreateError(null);
    if (!createName.trim()) {
      setCreateError("Restoran nomi kiritilishi shart");
      return;
    }
    if (!createAdminEmail.trim()) {
      setCreateError("Admin email kiritilishi shart");
      return;
    }
    if (!createAdminPassword || createAdminPassword.length < 6) {
      setCreateError("Admin paroli kamida 6 belgidan iborat bo‘lishi shart");
      return;
    }
    if (!createAdminName.trim()) {
      setCreateError("Admin ismi kiritilishi shart");
      return;
    }
    setCreateSubmitting(true);
    try {
      await adminApi.createRestaurant({
        name: createName.trim(),
        address: "",
        description: createDesc.trim() || undefined,
        deliveryFee: createFee ? Number(createFee) : undefined,
        platformFeePercent: createPlatformFeePercent ? Number(createPlatformFeePercent) : 10,
        logoUrl: createImageUrl.trim() || undefined,
        coverUrl: createImageUrl.trim() || undefined,
        isSupermarket,
        adminEmail: createAdminEmail.trim(),
        adminPassword: createAdminPassword,
        adminName: createAdminName.trim(),
      });
      setCreateName("");
      setCreateDesc("");
      setCreateFee("");
      setCreatePlatformFeePercent("10");
      setCreateImageUrl("");
      setCreateAdminEmail("");
      setCreateAdminPassword("");
      setCreateAdminName("");
      const overview = await fetchOverview();
      setData(overview);
      setActiveTab(isSupermarket ? "supermarkets" : "restaurants");
    } catch (err: any) {
      setCreateError(err.message ?? "Restoran qo‘shishda xatolik");
    } finally {
      setCreateSubmitting(false);
    }
  }

  function handleCreateRestaurant(e: React.FormEvent) {
    return createRestaurantCommon(e, false);
  }

  function handleCreateSupermarket(e: React.FormEvent) {
    return createRestaurantCommon(e, true);
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setProductError(null);
    if (!productName.trim()) {
      setProductError("Mahsulot nomi kiritilishi shart");
      return;
    }
    const price = productPrice ? Number(productPrice) : NaN;
    if (!Number.isFinite(price) || price <= 0) {
      setProductError("Narx noto‘g‘ri");
      return;
    }
    setProductSubmitting(true);
    try {
      await adminApi.createProduct({
        name: productName.trim(),
        price,
        unit: productUnit || "dona",
        imageUrl: productImageUrl.trim() || undefined,
        categoryId: productCategoryId || undefined,
      });
      setProductName("");
      setProductPrice("");
      setProductUnit("dona");
      setProductImageUrl("");
      setProductCategoryId("");
      setProductError("Mahsulot qo‘shildi.");
    } catch (err: any) {
      setProductError(err?.message ?? "Mahsulot qo‘shishda xatolik");
    } finally {
      setProductSubmitting(false);
    }
  }

  async function handleCreateProductCategory(e: React.FormEvent) {
    e.preventDefault();
    setProductError(null);
    if (!productCategoryName.trim()) {
      setProductError("Kategoriya nomi kiritilishi shart");
      return;
    }
    setProductCategorySubmitting(true);
    try {
      const created = await adminApi.createProductCategory({
        name: productCategoryName.trim(),
        imageUrl: productCategoryImageUrl.trim() || undefined,
        sortOrder: productCategorySort ? Number(productCategorySort) : undefined,
        isActive: true,
      });
      setProductCategories((prev) => [created, ...prev]);
      setProductCategoryName("");
      setProductCategorySort("");
      setProductCategoryImageUrl("");
    } catch (err: any) {
      setProductError(err.message ?? "Kategoriya qo‘shishda xatolik");
    } finally {
      setProductCategorySubmitting(false);
    }
  }

  async function handleUpdateProductCategory(id: string, patch: any) {
    try {
      const updated = await adminApi.updateProductCategory(id, patch);
      setProductCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      setProductError(err.message ?? "Kategoriya yangilashda xatolik");
    }
  }

  async function handleUploadProductCategoryImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setProductCategoryImageUploading(true);
    setProductError(null);
    try {
      const { url } = await adminApi.uploadImage(file);
      setProductCategoryImageUrl(url);
    } catch (err: any) {
      setProductError(err?.message ?? "Yuklashda xatolik");
    } finally {
      setProductCategoryImageUploading(false);
    }
  }

  async function handleCreateBanner(e: React.FormEvent) {
    e.preventDefault();
    setBannerError(null);
    if (!bannerTitle.trim()) {
      setBannerError("Sarlavha kiritilishi shart");
      return;
    }
    setBannerSubmitting(true);
    try {
      const created = await adminApi.createBanner({
        title: bannerTitle.trim(),
        text: bannerText.trim() || undefined,
        ctaLabel: bannerCtaLabel.trim() || undefined,
        ctaHref: bannerCtaHref.trim() || undefined,
        sortOrder: bannerSortOrder ? Number(bannerSortOrder) : undefined,
        isActive: true,
      });
      setBanners((prev) => [created, ...prev]);
      setBannerTitle("");
      setBannerText("");
      setBannerCtaLabel("");
      setBannerCtaHref("");
      setBannerSortOrder("");
    } catch (err: any) {
      setBannerError(err.message ?? "Banner qo‘shishda xatolik");
    } finally {
      setBannerSubmitting(false);
    }
  }

  async function handleUpdateBanner(id: string, patch: any) {
    try {
      const updated = await adminApi.updateBanner(id, patch);
      setBanners((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err: any) {
      setBannerError(err.message ?? "Banner yangilashda xatolik");
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "stats", label: "Statistika" },
    { id: "users", label: "Foydalanuvchilar" },
    { id: "restaurants", label: "Restoranlar" },
    { id: "supermarkets", label: "Supermarketlar" },
    { id: "restaurant-stats", label: "Statistika restoranlar" },
    { id: "visits", label: "Tashrifchilar" },
    { id: "settings", label: "Sozlamalar" },
  ];

  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label ?? activeTab;

  useEffect(() => {
    if (!tabsOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTabsOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [tabsOpen]);

  return (
    <div className="fd-shell fd-section fd-platform-admin-page">
      <header className="fd-admin-header">
        <button
          type="button"
          className="fd-btn fd-btn-primary"
          aria-label="Menyu"
          onClick={() => setTabsOpen(true)}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 24 }}>menu</span>
          <span style={{ marginLeft: 6 }}>Menyu</span>
        </button>
      </header>

      {tabsOpen && (
        <>
          <div
            className="fd-admin-sidebar-backdrop"
            role="button"
            aria-label="Yopish"
            onClick={() => setTabsOpen(false)}
          />
          <nav className="fd-admin-sidebar">
            <div className="fd-admin-sidebar-title">Bo‘limlar</div>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`fd-admin-tab ${activeTab === t.id ? "fd-admin-tab-active" : ""}`}
                onClick={() => {
                  setActiveTab(t.id);
                  setTabsOpen(false);
                }}
              >
                {t.label}
              </button>
            ))}
            <div className="fd-admin-sidebar-footer">
              <Link
                href="/"
                className="fd-admin-sidebar-back-link"
                onClick={() => setTabsOpen(false)}
              >
                Saytga qaytish
              </Link>
            </div>
          </nav>
        </>
      )}

      {loading && <p>Yuklanmoqda...</p>}
      {error && <p className="fd-empty">{error}</p>}
      {data && (
        <div className="fd-admin-main">
          <p className="fd-admin-current-tab">{activeTabLabel}</p>
            <div
              className={`fd-admin-panel ${activeTab === "stats" ? "fd-admin-panel-active" : ""}`}
            >
              <section className="fd-admin-kpis">
                {(() => {
                  const s = getStats();
                  return (
                    <>
                      <div className="fd-admin-kpi">
                        <div className="fd-admin-kpi-label">Restoranlar</div>
                        <div className="fd-admin-kpi-value">{s.restaurants}</div>
                      </div>
                      <div className="fd-admin-kpi">
                        <div className="fd-admin-kpi-label">Foydalanuvchilar</div>
                        <div className="fd-admin-kpi-value">{s.users}</div>
                        <div className="fd-admin-kpi-sub">Adminlar: {s.admins}</div>
                      </div>
                      <div className="fd-admin-kpi">
                        <div className="fd-admin-kpi-label">Buyurtmalar (oxirgilar)</div>
                        <div className="fd-admin-kpi-value">{s.totalOrders}</div>
                        <div className="fd-admin-kpi-sub">
                          Yetkazilgan: {s.delivered} · Bekor: {s.cancelled}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </section>

              <section style={{ marginTop: 24 }}>
                <h2>So‘nggi buyurtmalar</h2>
                {data.recentOrders?.map((o: any) => (
                  <div key={o.id} className="fd-checkout-item">
                    <div>
                      <div>#{o.id.slice(0, 8)}</div>
                      <div className="fd-checkout-meta">
                        {o.restaurant?.name} · {o.customer?.email} · {o.status}
                      </div>
                    </div>
                  </div>
                ))}
                {(!data.recentOrders || data.recentOrders.length === 0) && (
                  <p className="fd-empty">Buyurtmalar yo‘q.</p>
                )}
              </section>
            </div>

            <div
              className={`fd-admin-panel ${activeTab === "users" ? "fd-admin-panel-active" : ""}`}
            >
              <section>
                <h2>Foydalanuvchilar</h2>
                {data.users?.map((u: any) => (
                  <div key={u.id} className="fd-checkout-item">
                    <div>
                      <div>{u.email}</div>
                      <div className="fd-checkout-meta">
                        {u.name} · {u.role}
                      </div>
                    </div>
                    <select
                      value={u.role}
                      onChange={(e) => changeUserRole(u.id, e.target.value)}
                      style={{ marginLeft: "auto" }}
                    >
                      <option value="CUSTOMER">CUSTOMER</option>
                      <option value="RESTAURANT_ADMIN">RESTAURANT_ADMIN</option>
                      <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
                      <option value="COURIER">COURIER</option>
                    </select>
                  </div>
                ))}
                {(!data.users || data.users.length === 0) && (
                  <p className="fd-empty">Foydalanuvchilar yo‘q.</p>
                )}
              </section>
            </div>

            <div
              className={`fd-admin-panel ${activeTab === "restaurants" ? "fd-admin-panel-active" : ""}`}
            >
              <div className="fd-form-block">
                <h3>Yangi restoran qo‘shish</h3>
                <form onSubmit={handleCreateRestaurant} className="fd-form">
                  <label className="fd-field">
                    <span>Restoran nomi *</span>
                    <input
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="Masalan: Osh markazi"
                      required
                    />
                  </label>
                  <label className="fd-field">
                    <span>Tavsif</span>
                    <input
                      value={createDesc}
                      onChange={(e) => setCreateDesc(e.target.value)}
                      placeholder="Qisqacha tavsif"
                    />
                  </label>
                  <label className="fd-field">
                    <span>Rasm</span>
                    <input
                      type="url"
                      value={createImageUrl}
                      onChange={(e) => setCreateImageUrl(e.target.value)}
                      placeholder="URL yoki telefondan yuklang"
                    />
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        type="file"
                        accept="image/*"
                        id="create-restaurant-image-file"
                        style={{ display: "none" }}
                        onChange={handleUploadCreateImage}
                      />
                      <label htmlFor="create-restaurant-image-file" style={{ margin: 0 }}>
                        <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                          {createImageUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                        </span>
                      </label>
                    </div>
                    {createImageUrl.trim() && (
                      <img
                        src={imageUrl(createImageUrl.trim())}
                        alt="Rasm"
                        style={{ marginTop: 8, maxWidth: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </label>
                  <label className="fd-field">
                    <span>Yetkazib berish narxi (so‘m)</span>
                    <input
                      type="number"
                      min={0}
                      value={createFee}
                      onChange={(e) => setCreateFee(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <label className="fd-field">
                    <span>Platforma ulushi (%) — har bir buyurtma uchun</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={createPlatformFeePercent}
                      onChange={(e) => setCreatePlatformFeePercent(e.target.value)}
                      placeholder="10"
                    />
                  </label>
                  <p className="fd-checkout-meta" style={{ marginTop: 8, marginBottom: 4 }}>
                    Restoran admini (ushbu email va parol bilan kirib, shu restoran admin paneliga o‘tadi) *
                  </p>
                  <label className="fd-field">
                    <span>Admin email *</span>
                    <input
                      type="email"
                      value={createAdminEmail}
                      onChange={(e) => setCreateAdminEmail(e.target.value)}
                      placeholder="admin@restoran.uz"
                      required
                    />
                  </label>
                  <label className="fd-field">
                    <span>Admin paroli * (kamida 6 belgi)</span>
                    <input
                      type="password"
                      value={createAdminPassword}
                      onChange={(e) => setCreateAdminPassword(e.target.value)}
                      placeholder="••••••"
                      minLength={6}
                      required
                    />
                  </label>
                  <label className="fd-field">
                    <span>Admin ismi *</span>
                    <input
                      value={createAdminName}
                      onChange={(e) => setCreateAdminName(e.target.value)}
                      placeholder="Ism Familiya"
                      required
                    />
                  </label>
                  {createError && (
                    <p style={{ color: "var(--color-orange)", fontSize: "0.875rem" }}>
                      {createError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="fd-btn fd-btn-primary"
                    disabled={createSubmitting || createImageUploading}
                  >
                    {createSubmitting ? "Saqlanmoqda..." : "Restoran qo‘shish"}
                  </button>
                </form>
              </div>
              <section>
                <h2>Barcha restoranlar</h2>
                <p className="fd-checkout-meta" style={{ marginBottom: 12 }}>
                  Bosh sahifadagi «Top restoranlar» karuseli: faqat supermarket bo‘lmagan restoranlarni tanlang va tartib raqamini kiriting.
                </p>
                {data.restaurants?.map((r: any) => (
                  <div key={r.id} className="fd-checkout-item">
                    <div>
                      <div>{r.name}</div>
                      <div className="fd-checkout-meta">{r.address || "—"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <label className="fd-checkout-meta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        Platforma %:
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          defaultValue={r.platformFeePercent ?? 10}
                          style={{ width: 56, padding: "4px 6px", fontSize: "0.875rem" }}
                          onBlur={async (e) => {
                            const val = Number((e.target as HTMLInputElement).value);
                            if (!Number.isFinite(val) || val < 0 || val > 100) return;
                            try {
                              const updated = await adminApi.updateRestaurant(r.id, { platformFeePercent: val });
                              setData((prev: any) =>
                                prev
                                  ? {
                                      ...prev,
                                      restaurants: prev.restaurants.map((x: any) =>
                                        x.id === r.id ? { ...x, platformFeePercent: updated.platformFeePercent } : x,
                                      ),
                                    }
                                  : prev,
                              );
                            } catch (err: any) {
                              setError(err?.message ?? "Xatolik");
                            }
                          }}
                        />
                      </label>
                      {!r.isSupermarket && (
                        <>
                          <label className="fd-checkout-meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                              type="checkbox"
                              checked={!!r.isFeatured}
                              onChange={async (e) => {
                                try {
                                  const updated = await adminApi.updateRestaurant(r.id, {
                                    isFeatured: e.target.checked,
                                  });
                                  setData((prev: any) =>
                                    prev
                                      ? {
                                          ...prev,
                                          restaurants: prev.restaurants.map((x: any) =>
                                            x.id === r.id ? { ...x, isFeatured: updated.isFeatured } : x,
                                          ),
                                        }
                                      : prev,
                                  );
                                } catch (err: any) {
                                  setError(err?.message ?? "Xatolik");
                                }
                              }}
                            />
                            Top karuselda
                          </label>
                          {r.isFeatured && (
                            <label className="fd-checkout-meta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Tartib:
                              <input
                                type="number"
                                min={0}
                                defaultValue={r.featuredSortOrder ?? 0}
                                style={{ width: 56, padding: "4px 6px", fontSize: "0.875rem" }}
                                onBlur={async (e) => {
                                  const val = Number(e.target.value) || 0;
                                  try {
                                    const updated = await adminApi.updateRestaurant(r.id, {
                                      featuredSortOrder: val,
                                    });
                                    setData((prev: any) =>
                                      prev
                                        ? {
                                            ...prev,
                                            restaurants: prev.restaurants.map((x: any) =>
                                              x.id === r.id ? { ...x, featuredSortOrder: updated.featuredSortOrder } : x,
                                            ),
                                          }
                                        : prev,
                                    );
                                  } catch (err: any) {
                                    setError(err?.message ?? "Xatolik");
                                  }
                                }}
                              />
                            </label>
                          )}
                        </>
                      )}
                      <Link
                        href={`/platform-admin/restaurants/${r.id}`}
                        className="fd-btn fd-btn-primary"
                        style={{ textDecoration: "none", flexShrink: 0 }}
                      >
                        Menyu
                      </Link>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <input
                          type="email"
                          placeholder="Admin email (tayinlash)"
                          value={addAdminEmails[r.id] ?? ""}
                          onChange={(e) =>
                            setAddAdminEmails((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                          style={{ width: 160, padding: "6px 8px", fontSize: "0.875rem" }}
                        />
                        <button
                          type="button"
                          className="fd-btn"
                          disabled={!(addAdminEmails[r.id] ?? "").trim() || addAdminSubmitting[r.id]}
                          onClick={async () => {
                            const email = (addAdminEmails[r.id] ?? "").trim();
                            if (!email) return;
                            setAddAdminSubmitting((prev) => ({ ...prev, [r.id]: true }));
                            try {
                              await adminApi.addRestaurantAdmin(r.id, email);
                              setAddAdminEmails((prev) => ({ ...prev, [r.id]: "" }));
                            } catch (err: any) {
                              setError(err?.message ?? "Xatolik");
                            } finally {
                              setAddAdminSubmitting((prev) => ({ ...prev, [r.id]: false }));
                            }
                          }}
                        >
                          {addAdminSubmitting[r.id] ? "..." : "Adminni tayinlash"}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="fd-btn"
                        onClick={async () => {
                          try {
                            await adminApi.deleteRestaurant(r.id);
                            setData((prev: any) =>
                              prev
                                ? {
                                    ...prev,
                                    restaurants: prev.restaurants.filter((x: any) => x.id !== r.id),
                                  }
                                : prev,
                            );
                          } catch (err: any) {
                            setError(err?.message ?? "Restoranni o‘chirishda xatolik");
                          }
                        }}
                      >
                        O‘chirish
                      </button>
                    </div>
                  </div>
                ))}
                {(!data.restaurants || data.restaurants.length === 0) && (
                  <p className="fd-empty">Restoranlar yo‘q. Yuqoridagi formadan qo‘shing.</p>
                )}
              </section>
            </div>

            <div
              className={`fd-admin-panel ${activeTab === "supermarkets" ? "fd-admin-panel-active" : ""}`}
            >
              <section>
                <h2>Supermarketlar</h2>
                <p className="fd-card-desc" style={{ marginBottom: 12 }}>
                  Hozircha supermarketlar ham restoranlar kabi yagona jadvalda saqlanadi. Siz alohida
                  „supermarket“ sifatida restoran yaratishingiz mumkin.
                </p>
                <div className="fd-form-block">
                  <h3>Yangi supermarket qo‘shish</h3>
                  <form onSubmit={handleCreateSupermarket} className="fd-form">
                    <label className="fd-field">
                      <span>Supermarket nomi *</span>
                      <input
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="Masalan: Market 24/7"
                        required
                      />
                    </label>
                    <label className="fd-field">
                      <span>Tavsif</span>
                      <input
                        value={createDesc}
                        onChange={(e) => setCreateDesc(e.target.value)}
                        placeholder="Masalan: 24/7 supermarket"
                      />
                    </label>
                    <label className="fd-field">
                      <span>Rasm</span>
                      <input
                        type="url"
                        value={createImageUrl}
                        onChange={(e) => setCreateImageUrl(e.target.value)}
                        placeholder="URL yoki telefondan yuklang"
                      />
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                          type="file"
                          accept="image/*"
                          id="create-supermarket-image-file"
                          style={{ display: "none" }}
                          onChange={handleUploadCreateImage}
                        />
                        <label htmlFor="create-supermarket-image-file" style={{ margin: 0 }}>
                          <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                            {createImageUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                          </span>
                        </label>
                      </div>
                      {createImageUrl.trim() && (
                        <img
                          src={imageUrl(createImageUrl.trim())}
                          alt="Rasm"
                          style={{ marginTop: 8, maxWidth: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </label>
                    <label className="fd-field">
                      <span>Platforma ulushi (%) — har bir buyurtma uchun</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={createPlatformFeePercent}
                        onChange={(e) => setCreatePlatformFeePercent(e.target.value)}
                        placeholder="10"
                      />
                    </label>
                    <p className="fd-checkout-meta" style={{ marginTop: 8, marginBottom: 4 }}>
                      Do‘kon admini (ushbu email va parol bilan kirib, shu do‘kon admin paneliga o‘tadi) *
                    </p>
                    <label className="fd-field">
                      <span>Admin email *</span>
                      <input
                        type="email"
                        value={createAdminEmail}
                        onChange={(e) => setCreateAdminEmail(e.target.value)}
                        placeholder="admin@dokon.uz"
                        required
                      />
                    </label>
                    <label className="fd-field">
                      <span>Admin paroli * (kamida 6 belgi)</span>
                      <input
                        type="password"
                        value={createAdminPassword}
                        onChange={(e) => setCreateAdminPassword(e.target.value)}
                        placeholder="••••••"
                        minLength={6}
                        required
                      />
                    </label>
                    <label className="fd-field">
                      <span>Admin ismi *</span>
                      <input
                        value={createAdminName}
                        onChange={(e) => setCreateAdminName(e.target.value)}
                        placeholder="Ism Familiya"
                        required
                      />
                    </label>
                    {createError && (
                      <p style={{ color: "var(--color-orange)", fontSize: "0.875rem" }}>
                        {createError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="fd-btn fd-btn-primary"
                      disabled={createSubmitting || createImageUploading}
                    >
                      {createSubmitting ? "Saqlanmoqda..." : "Supermarket qo‘shish"}
                    </button>
                  </form>
                </div>
              </section>
            </div>

            <div
              className={`fd-admin-panel ${activeTab === "visits" ? "fd-admin-panel-active" : ""}`}
            >
              <section>
                <h2>Tashrifchilar (so‘nggi 7 kun)</h2>
                {visitStatsLoading && <p>Yuklanmoqda…</p>}
                {!visitStatsLoading && visitStats && (
                  <>
                    <div className="fd-form-block" style={{ marginTop: 16 }}>
                      <h3>Jami tashriflar: {visitStats.total} ta</h3>
                    </div>
                    <div className="fd-form-block" style={{ marginTop: 16 }}>
                      <h3>Kunlar bo‘yicha</h3>
                      <ul style={{ paddingLeft: 20 }}>
                        {visitStats.byDay.map((d) => (
                          <li key={d.date}>
                            {d.date}: <strong>{d.count}</strong> tashrif
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="fd-form-block" style={{ marginTop: 16 }}>
                      <h3>Soatlar bo‘yicha (qachon faol)</h3>
                      <p className="fd-checkout-meta">Soatlar UTC bo‘yicha. Eng ko‘p tashriflar qaysi soatda bo‘lgani.</p>
                      <ul style={{ paddingLeft: 20, display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", marginTop: 8 }}>
                        {visitStats.byHour.map((h) => (
                          <li key={h.hour} style={{ padding: "6px 10px", background: "var(--fd-bg-2)", borderRadius: 6 }}>
                            {h.hour}:00 — {h.count} ta
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                {!visitStatsLoading && !visitStats && activeTab === "visits" && (
                  <p>Statistikani yuklashda xatolik.</p>
                )}
              </section>
            </div>

            <div
              className={`fd-admin-panel ${activeTab === "restaurant-stats" ? "fd-admin-panel-active" : ""}`}
            >
              <section>
                <h2>Statistika restoranlar</h2>
                {restaurantStatsLoading && <p>Yuklanmoqda…</p>}
                {!restaurantStatsLoading && restaurantStats && (
                  <>
                    <div className="fd-form-block" style={{ marginTop: 16 }}>
                      <h3>1. Yetkazilgan buyurtmalar (so‘nggi 7 kun)</h3>
                      <p>
                        <strong>Son:</strong> {restaurantStats.deliveredLast7Days.count} ta
                        &nbsp;|&nbsp;
                        <strong>Jami summa:</strong> {restaurantStats.deliveredLast7Days.totalAmount.toLocaleString("uz")} so‘m
                      </p>
                    </div>
                    <div className="fd-form-block" style={{ marginTop: 16 }}>
                      <h3>2. Top taomlar</h3>
                      <p style={{ marginBottom: 8 }}>Jami summa bo‘yicha:</p>
                      <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
                        {restaurantStats.topDishesByAmount.slice(0, 10).map((d, i) => (
                          <li key={i}>
                            {d.dishName} ({d.restaurantName}) — {d.totalAmount.toLocaleString("uz")} so‘m, {d.totalQuantity} ta
                          </li>
                        ))}
                        {restaurantStats.topDishesByAmount.length === 0 && <li>Ma’lumot yo‘q</li>}
                      </ul>
                      <p style={{ marginBottom: 8 }}>Soni bo‘yicha:</p>
                      <ul style={{ paddingLeft: 20 }}>
                        {restaurantStats.topDishesByQuantity.slice(0, 10).map((d, i) => (
                          <li key={i}>
                            {d.dishName} ({d.restaurantName}) — {d.totalQuantity} ta, {d.totalAmount.toLocaleString("uz")} so‘m
                          </li>
                        ))}
                        {restaurantStats.topDishesByQuantity.length === 0 && <li>Ma’lumot yo‘q</li>}
                      </ul>
                    </div>
                    <div className="fd-form-block" style={{ marginTop: 16 }}>
                      <h3>3. Restoran qarzi (platforma foizi)</h3>
                      <ul style={{ paddingLeft: 20, listStyle: "none" }}>
                        {restaurantStats.restaurantBalances.map((r) => (
                          <li key={r.restaurantId} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span><strong>{r.restaurantName}</strong>: {r.amountOwed.toLocaleString("uz")} so‘m</span>
                            <button
                              type="button"
                              className="fd-btn fd-btn--secondary"
                              onClick={async () => {
                                try {
                                  await adminApi.clearRestaurantPlatformFee(r.restaurantId);
                                  const res = await adminApi.getRestaurantStatsAdmin();
                                  setRestaurantStats(res);
                                } catch (_) {}
                              }}
                            >
                              Obnulit
                            </button>
                          </li>
                        ))}
                        {restaurantStats.restaurantBalances.length === 0 && <li>Ma’lumot yo‘q</li>}
                      </ul>
                    </div>
                    <div className="fd-form-block" style={{ marginTop: 16 }}>
                      <h3>4. Qachon ko‘p buyurtma beriladi</h3>
                      <p style={{ marginBottom: 8 }}>Kunlar bo‘yicha (yetkazilgan buyurtmalar):</p>
                      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                        {["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"].map((name, i) => (
                          <li key={i}>
                            {name}: {restaurantStats.ordersByDayOfWeek[i]?.count ?? 0} ta
                          </li>
                        ))}
                      </ul>
                      <p style={{ marginBottom: 8 }}>Soatlar bo‘yicha:</p>
                      <ul style={{ paddingLeft: 20, display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none" }}>
                        {restaurantStats.ordersByHour.map((h) => (
                          <li key={h.hour} style={{ padding: "4px 8px", background: "var(--fd-bg-2)", borderRadius: 4 }}>
                            {h.hour}:00 — {h.count} ta
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                {!restaurantStatsLoading && !restaurantStats && activeTab === "restaurant-stats" && (
                  <p>Statistikani yuklashda xatolik.</p>
                )}
              </section>
            </div>

            <div
              className={`fd-admin-panel ${activeTab === "settings" ? "fd-admin-panel-active" : ""}`}
            >
              <section>
                <h2>Sayt sozlamalari</h2>
                <div className="fd-form-block" style={{ marginTop: 16 }}>
                  <h3>Bosh sahifa bannerlari</h3>
                  <p className="fd-checkout-meta">
                    Bu yerda kategoriya tugmalarining ostida ko‘rinadigan reklama bannerlarini
                    boshqarishingiz mumkin.
                  </p>

                  <form onSubmit={handleCreateBanner} className="fd-form" style={{ marginTop: 16 }}>
                    <label className="fd-field">
                      <span>Sarlavha *</span>
                      <input
                        value={bannerTitle}
                        onChange={(e) => setBannerTitle(e.target.value)}
                        placeholder="Masalan: Chegirma 30%"
                        required
                      />
                    </label>
                    <label className="fd-field">
                      <span>Matn</span>
                      <input
                        value={bannerText}
                        onChange={(e) => setBannerText(e.target.value)}
                        placeholder="Qisqacha izoh"
                      />
                    </label>
                    <label className="fd-field">
                      <span>Tugma matni</span>
                      <input
                        value={bannerCtaLabel}
                        onChange={(e) => setBannerCtaLabel(e.target.value)}
                        placeholder="Masalan: Aksiyani ko‘rish"
                      />
                    </label>
                    <label className="fd-field">
                      <span>Tugma havolasi (ixtiyoriy)</span>
                      <input
                        value={bannerCtaHref}
                        onChange={(e) => setBannerCtaHref(e.target.value)}
                        placeholder="Masalan: /supermarkets"
                      />
                    </label>
                    <label className="fd-field">
                      <span>Tartib (ixtiyoriy)</span>
                      <input
                        type="number"
                        value={bannerSortOrder}
                        onChange={(e) => setBannerSortOrder(e.target.value)}
                        placeholder="0"
                      />
                    </label>
                    {bannerError && (
                      <p style={{ color: "var(--color-orange)", fontSize: "0.875rem" }}>
                        {bannerError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="fd-btn fd-btn-primary"
                      disabled={bannerSubmitting}
                    >
                      {bannerSubmitting ? "Saqlanmoqda..." : "Banner qo‘shish"}
                    </button>
                  </form>
                </div>

                <section style={{ marginTop: 24 }}>
                  <h3>Mavjud bannerlar</h3>
                  {banners.length === 0 && (
                    <p className="fd-empty">Hozircha bannerlar yo‘q.</p>
                  )}
                  <div className="fd-admin-kpis" style={{ marginTop: 12 }}>
                    {banners.map((b) => (
                      <div key={b.id} className="fd-admin-kpi">
                        <div className="fd-admin-kpi-label">ID: {b.id.slice(0, 8)}</div>
                        <div className="fd-admin-kpi-value">{b.title}</div>
                        {b.text && (
                          <div className="fd-admin-kpi-sub">{b.text}</div>
                        )}
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <label className="fd-checkout-meta">
                            <input
                              type="checkbox"
                              checked={!!b.isActive}
                              onChange={(e) =>
                                handleUpdateBanner(b.id, { isActive: e.target.checked })
                              }
                            />{" "}
                            Faol
                          </label>
                          <label className="fd-checkout-meta">
                            Tartib:{" "}
                            <input
                              type="number"
                              defaultValue={b.sortOrder ?? 0}
                              style={{
                                width: 72,
                                marginLeft: 4,
                                padding: "2px 6px",
                                fontSize: "0.8rem",
                              }}
                              onBlur={(e) =>
                                handleUpdateBanner(b.id, {
                                  sortOrder: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="fd-btn"
                            onClick={async () => {
                              try {
                                await adminApi.deleteBanner(b.id);
                                setBanners((prev) => prev.filter((x) => x.id !== b.id));
                              } catch (err: any) {
                                setBannerError(err?.message ?? "Banner o‘chirishda xatolik");
                              }
                            }}
                          >
                            O‘chirish
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </section>
            </div>
          </div>
      )}
    </div>
  );
}
