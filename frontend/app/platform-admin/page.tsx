"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi } from "../../lib/adminApi";
import { imageUrl } from "../../lib/api";
import { BackLink } from "../../components/BackLink";

type TabId =
  | "stats"
  | "users"
  | "restaurants"
  | "supermarkets"
  | "products"
  | "couriers"
  | "settings";

export default function PlatformAdminPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("stats");
  const [tabsOpen, setTabsOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createLogoUrl, setCreateLogoUrl] = useState("");
  const [createCoverUrl, setCreateCoverUrl] = useState("");
  const [createFee, setCreateFee] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLogoUploading, setCreateLogoUploading] = useState(false);
  const [createCoverUploading, setCreateCoverUploading] = useState(false);
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
  const router = useRouter();

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCreateLogoUploading(true);
    try {
      const { url } = await adminApi.uploadImage(file);
      setCreateLogoUrl(url);
    } catch (err: any) {
      setCreateError(err?.message ?? "Yuklashda xatolik");
    } finally {
      setCreateLogoUploading(false);
    }
  }

  async function handleUploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCreateCoverUploading(true);
    try {
      const { url } = await adminApi.uploadImage(file);
      setCreateCoverUrl(url);
    } catch (err: any) {
      setCreateError(err?.message ?? "Yuklashda xatolik");
    } finally {
      setCreateCoverUploading(false);
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

    if (!res.ok) throw new Error("Server xatosi");
    return (await res.json()) as any;
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
    setCreateSubmitting(true);
    try {
      await adminApi.createRestaurant({
        name: createName.trim(),
        address: createAddress.trim() || undefined,
        description: createDesc.trim() || undefined,
        deliveryFee: createFee ? Number(createFee) : undefined,
        logoUrl: createLogoUrl.trim() || undefined,
        coverUrl: createCoverUrl.trim() || undefined,
        isSupermarket,
      });
      setCreateName("");
      setCreateAddress("");
      setCreateDesc("");
      setCreateFee("");
       setCreateLogoUrl("");
       setCreateCoverUrl("");
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
    { id: "products", label: "Mahsulotlar" },
    { id: "couriers", label: "Kuryerlar" },
    { id: "settings", label: "Sozlamalar" },
  ];

  return (
    <div className="fd-shell fd-section">
      <BackLink href="/profile">← Profil</BackLink>
      <h1 className="fd-section-title">Platforma admin paneli</h1>
      <button
        type="button"
        className="fd-btn"
        style={{ marginTop: 8, marginBottom: 8 }}
        onClick={() => setTabsOpen((open) => !open)}
      >
        {tabsOpen ? "Bo‘limlarni yopish" : "Bo‘limlar menyusi"}
      </button>
      {loading && <p>Yuklanmoqda...</p>}
      {error && <p className="fd-empty">{error}</p>}
      {data && (
        <div className="fd-admin-layout">
          <nav
            className="fd-admin-tabs"
            style={tabsOpen ? undefined : { display: "none" }}
          >
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
          </nav>

          <div className="fd-admin-main">
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
                    <span>Manzil</span>
                    <input
                      value={createAddress}
                      onChange={(e) => setCreateAddress(e.target.value)}
                      placeholder="Toshkent, ..."
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
                    <span>Logo rasm</span>
                    <input
                      type="url"
                      value={createLogoUrl}
                      onChange={(e) => setCreateLogoUrl(e.target.value)}
                      placeholder="URL yoki telefondan yuklang"
                    />
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        type="file"
                        accept="image/*"
                        id="create-logo-file"
                        style={{ display: "none" }}
                        onChange={handleUploadLogo}
                      />
                      <label htmlFor="create-logo-file" style={{ margin: 0 }}>
                        <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                          {createLogoUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                        </span>
                      </label>
                    </div>
                    {createLogoUrl.trim() && (
                      <img
                        src={imageUrl(createLogoUrl.trim())}
                        alt="Logo"
                        style={{ marginTop: 8, maxWidth: 80, maxHeight: 80, objectFit: "contain", borderRadius: 8 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </label>
                  <label className="fd-field">
                    <span>Banner / muqova rasm</span>
                    <input
                      type="url"
                      value={createCoverUrl}
                      onChange={(e) => setCreateCoverUrl(e.target.value)}
                      placeholder="URL yoki telefondan yuklang"
                    />
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        type="file"
                        accept="image/*"
                        id="create-cover-file"
                        style={{ display: "none" }}
                        onChange={handleUploadCover}
                      />
                      <label htmlFor="create-cover-file" style={{ margin: 0 }}>
                        <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                          {createCoverUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                        </span>
                      </label>
                    </div>
                    {createCoverUrl.trim() && (
                      <img
                        src={imageUrl(createCoverUrl.trim())}
                        alt="Cover"
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
                  {createError && (
                    <p style={{ color: "var(--color-orange)", fontSize: "0.875rem" }}>
                      {createError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="fd-btn fd-btn-primary"
                    disabled={createSubmitting || createLogoUploading || createCoverUploading}
                  >
                    {createSubmitting ? "Saqlanmoqda..." : "Restoran qo‘shish"}
                  </button>
                </form>
              </div>
              <section>
                <h2>Barcha restoranlar</h2>
                {data.restaurants?.map((r: any) => (
                  <div key={r.id} className="fd-checkout-item">
                    <div>
                      <div>{r.name}</div>
                      <div className="fd-checkout-meta">{r.address || "—"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        href={`/platform-admin/restaurants/${r.id}`}
                        className="fd-btn fd-btn-primary"
                        style={{ textDecoration: "none", flexShrink: 0 }}
                      >
                        Menyu
                      </Link>
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
                      <span>Manzil</span>
                      <input
                        value={createAddress}
                        onChange={(e) => setCreateAddress(e.target.value)}
                        placeholder="Toshkent, ..."
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
                      <span>Logo rasm</span>
                      <input
                        type="url"
                        value={createLogoUrl}
                        onChange={(e) => setCreateLogoUrl(e.target.value)}
                        placeholder="URL yoki telefondan yuklang"
                      />
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                          type="file"
                          accept="image/*"
                          id="create-supermarket-logo-file"
                          style={{ display: "none" }}
                          onChange={handleUploadLogo}
                        />
                        <label htmlFor="create-supermarket-logo-file" style={{ margin: 0 }}>
                          <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                            {createLogoUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                          </span>
                        </label>
                      </div>
                      {createLogoUrl.trim() && (
                        <img
                          src={imageUrl(createLogoUrl.trim())}
                          alt="Logo"
                          style={{ marginTop: 8, maxWidth: 80, maxHeight: 80, objectFit: "contain", borderRadius: 8 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </label>
                    <label className="fd-field">
                      <span>Banner / muqova rasm</span>
                      <input
                        type="url"
                        value={createCoverUrl}
                        onChange={(e) => setCreateCoverUrl(e.target.value)}
                        placeholder="URL yoki telefondan yuklang"
                      />
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                          type="file"
                          accept="image/*"
                          id="create-supermarket-cover-file"
                          style={{ display: "none" }}
                          onChange={handleUploadCover}
                        />
                        <label htmlFor="create-supermarket-cover-file" style={{ margin: 0 }}>
                          <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                            {createCoverUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                          </span>
                        </label>
                      </div>
                      {createCoverUrl.trim() && (
                        <img
                          src={imageUrl(createCoverUrl.trim())}
                          alt="Cover"
                          style={{ marginTop: 8, maxWidth: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </label>
                    {createError && (
                      <p style={{ color: "var(--color-orange)", fontSize: "0.875rem" }}>
                        {createError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="fd-btn fd-btn-primary"
                      disabled={createSubmitting}
                    >
                      {createSubmitting ? "Saqlanmoqda..." : "Supermarket qo‘shish"}
                    </button>
                  </form>
                </div>
              </section>
            </div>

            <div
              className={`fd-admin-panel ${activeTab === "products" ? "fd-admin-panel-active" : ""}`}
            >
              <section>
                <h2>Mahsulotlar va kategoriyalar</h2>
                <p className="fd-card-desc" style={{ marginBottom: 12 }}>
                  Bu yerda umumiy mahsulotlar katalogi va ularning kategoriyalari boshqariladi.
                </p>

                <div className="fd-form-block">
                  <h3>Mahsulot kategoriyalari</h3>
                  <form onSubmit={handleCreateProductCategory} className="fd-form">
                    <label className="fd-field">
                      <span>Nomi *</span>
                      <input
                        value={productCategoryName}
                        onChange={(e) => setProductCategoryName(e.target.value)}
                        placeholder="Masalan: Sut mahsulotlari"
                        required
                      />
                    </label>
                    <label className="fd-field">
                      <span>Tartib (ixtiyoriy)</span>
                      <input
                        type="number"
                        value={productCategorySort}
                        onChange={(e) => setProductCategorySort(e.target.value)}
                        placeholder="0"
                      />
                    </label>
                    <label className="fd-field">
                      <span>Rasm (ixtiyoriy)</span>
                      <input
                        type="url"
                        value={productCategoryImageUrl}
                        onChange={(e) => setProductCategoryImageUrl(e.target.value)}
                        placeholder="URL yoki telefondan yuklang"
                      />
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                          type="file"
                          accept="image/*"
                          id="product-category-image-file"
                          style={{ display: "none" }}
                          onChange={handleUploadProductCategoryImage}
                        />
                        <label htmlFor="product-category-image-file" style={{ margin: 0 }}>
                          <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                            {productCategoryImageUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                          </span>
                        </label>
                      </div>
                      {productCategoryImageUrl.trim() && (
                        <img
                          src={imageUrl(productCategoryImageUrl.trim())}
                          alt="Kategoriya rasm"
                          style={{ marginTop: 8, maxWidth: 80, maxHeight: 80, objectFit: "cover", borderRadius: 8 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </label>
                    <button
                      type="submit"
                      className="fd-btn fd-btn-primary"
                      disabled={productCategorySubmitting}
                    >
                      {productCategorySubmitting ? "Saqlanmoqda..." : "Kategoriya qo‘shish"}
                    </button>
                  </form>

                  <section style={{ marginTop: 16 }}>
                    <h3>Mavjud kategoriyalar</h3>
                    {productCategories.length === 0 && (
                      <p className="fd-empty">Hozircha mahsulot kategoriyalari yo‘q.</p>
                    )}
                    <div className="fd-admin-kpis" style={{ marginTop: 12 }}>
                      {productCategories.map((c) => (
                        <div key={c.id} className="fd-admin-kpi">
                          <div className="fd-admin-kpi-label">ID: {c.id.slice(0, 8)}</div>
                          <div className="fd-admin-kpi-value">{c.name}</div>
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
                                checked={!!c.isActive}
                                onChange={(e) =>
                                  handleUpdateProductCategory(c.id, {
                                    isActive: e.target.checked,
                                  })
                                }
                              />{" "}
                              Faol
                            </label>
                            <label className="fd-checkout-meta">
                              Tartib:{" "}
                              <input
                                type="number"
                                defaultValue={c.sortOrder ?? 0}
                                style={{
                                  width: 72,
                                  marginLeft: 4,
                                  padding: "2px 6px",
                                  fontSize: "0.8rem",
                                }}
                                onBlur={(e) =>
                                  handleUpdateProductCategory(c.id, {
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
                                  await adminApi.deleteProductCategory(c.id);
                                  setProductCategories((prev) =>
                                    prev.filter((x: any) => x.id !== c.id),
                                  );
                                } catch (err: any) {
                                  setProductError(err?.message ?? "Kategoriya o‘chirishda xatolik");
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
                </div>

                <div className="fd-form-block">
                  <h3>Mahsulot qo‘shish</h3>
                  <form onSubmit={handleCreateProduct} className="fd-form">
                    <label className="fd-field">
                      <span>Mahsulot nomi *</span>
                      <input
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Masalan: Cola 1L"
                        required
                      />
                    </label>
                    <label className="fd-field">
                      <span>Narx (so‘m) *</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        placeholder="12000"
                        required
                      />
                    </label>
                    <label className="fd-field">
                      <span>O‘lchov birligi</span>
                      <input
                        value={productUnit}
                        onChange={(e) => setProductUnit(e.target.value)}
                        placeholder="dona, kg va hokazo"
                      />
                    </label>
                    <label className="fd-field">
                      <span>Kategoriya</span>
                      <select
                        value={productCategoryId}
                        onChange={(e) => setProductCategoryId(e.target.value)}
                      >
                        <option value="">— Tanlanmagan —</option>
                        {productCategories
                          .filter((c) => c.isActive)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="fd-field">
                      <span>Rasm (ixtiyoriy)</span>
                      <input
                        type="url"
                        value={productImageUrl}
                        onChange={(e) => setProductImageUrl(e.target.value)}
                        placeholder="URL yoki telefondan yuklang"
                      />
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                          type="file"
                          accept="image/*"
                          id="product-image-file"
                          style={{ display: "none" }}
                          onChange={handleUploadProductImage}
                        />
                        <label htmlFor="product-image-file" style={{ margin: 0 }}>
                          <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                            Telefondan yuklash
                          </span>
                        </label>
                      </div>
                      {productImageUrl.trim() && (
                        <img
                          src={imageUrl(productImageUrl.trim())}
                          alt="Mahsulot rasm"
                          style={{ marginTop: 8, maxWidth: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </label>
                    {productError && (
                      <p style={{ color: "var(--color-orange)", fontSize: "0.875rem" }}>
                        {productError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="fd-btn fd-btn-primary"
                      disabled={productSubmitting}
                    >
                      {productSubmitting ? "Saqlanmoqda..." : "Mahsulot qo‘shish"}
                    </button>
                  </form>
                </div>
              </section>
            </div>

            <div
              className={`fd-admin-panel ${activeTab === "couriers" ? "fd-admin-panel-active" : ""}`}
            >
              <section>
                <h2>Kuryerlar</h2>
                <p className="fd-card-desc" style={{ marginBottom: 12 }}>
                  Kuryerlar foydalanuvchilar orasida COURIER roli orqali boshqariladi. Yangi kuryer
                  qo‘shish uchun avval foydalanuvchi yaratib, so‘ngra “Foydalanuvchilar” bo‘limida
                  unga COURIER rolini bering.
                </p>
                <h3>Kuryerlar ro‘yxati</h3>
                {data.users?.filter((u: any) => u.role === "COURIER").map((u: any) => (
                  <div key={u.id} className="fd-checkout-item">
                    <div>
                      <div>{u.email}</div>
                      <div className="fd-checkout-meta">{u.name}</div>
                    </div>
                  </div>
                ))}
                {(!data.users || !data.users.some((u: any) => u.role === "COURIER")) && (
                  <p className="fd-empty">Hozircha kuryerlar qo‘shilmagan.</p>
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
        </div>
      )}
    </div>
  );
}
