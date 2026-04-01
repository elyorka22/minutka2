"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi } from "../../lib/adminApi";
import { imageUrl } from "../../lib/api";
import { decodeJwtPayload } from "../../lib/jwt";
import { clearAuthTokens, getAccessToken, logoutWithRefreshToken } from "../../lib/auth-tokens";
type TabId =
  | "stats"
  | "users"
  | "restaurants"
  | "supermarkets"
  | "restaurant-stats"
  | "visits"
  | "applications"
  | "settings"
  | "push";

export default function PlatformAdminPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("stats");
  const [userSubTab, setUserSubTab] = useState<"customers" | "admins" | "couriers">("customers");
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
  const [showCreateRestaurantForm, setShowCreateRestaurantForm] = useState(false);
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editRestaurantForm, setEditRestaurantForm] = useState<{
    name: string;
    description: string;
    imageUrl: string;
    platformFeePercent: string;
    isFeatured: boolean;
    featuredSortOrder: string;
    carouselNational: boolean;
    carouselNationalSort: string;
    carouselFastFood: boolean;
    carouselFastFoodSort: string;
  }>({
    name: "",
    description: "",
    imageUrl: "",
    platformFeePercent: "10",
    isFeatured: false,
    featuredSortOrder: "0",
    carouselNational: false,
    carouselNationalSort: "0",
    carouselFastFood: false,
    carouselFastFoodSort: "0",
  });
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
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerImageUploading, setBannerImageUploading] = useState(false);
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
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [pushUrl, setPushUrl] = useState("/");
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);
  const [pushSubscribersCustomers, setPushSubscribersCustomers] = useState<Array<{
    id: string;
    email: string;
    name: string;
    createdAt: string;
    pushSubscriptionsCount: number;
    ordersCount: number;
  }>>([]);
  const [pushSubscribersLoading, setPushSubscribersLoading] = useState(false);
  const [partnershipApplications, setPartnershipApplications] = useState<
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
  >([]);
  const [partnershipApplicationsLoading, setPartnershipApplicationsLoading] = useState(false);
  const router = useRouter();
  const [platformGate, setPlatformGate] = useState<"checking" | "allowed" | "redirected">(
    "checking",
  );
  const basePushPages: Array<{ url: string; label: string }> = [
    { url: "/", label: "Bosh sahifa (/)" },
    { url: "/restaurants", label: "Restoranlar (/restaurants)" },
    { url: "/supermarkets", label: "Do‘konlar (/supermarkets)" },
    { url: "/checkout", label: "Savat (/checkout)" },
    { url: "/profile", label: "Profil (/profile)" },
    { url: "/login", label: "Kirish (/login)" },
    { url: "/register", label: "Ro‘yxatdan o‘tish (/register)" },
    { url: "/courier", label: "Kuryer paneli (/courier)" },
    { url: "/platform-admin", label: "Platforma admin (/platform-admin)" },
  ];
  const restaurantPushPages: Array<{ url: string; label: string }> = (data?.restaurants ?? []).map((r: any) => ({
    url: `/restaurants/${r.id}`,
    label: `Restoran sahifasi: ${r.name} (/restaurants/${r.id})`,
  }));
  const restaurantAdminPushPages: Array<{ url: string; label: string }> = (data?.restaurants ?? []).map((r: any) => ({
    url: `/restaurant-admin/${r.id}`,
    label: `Restoran admin: ${r.name} (/restaurant-admin/${r.id})`,
  }));
  const pushPageOptions = [
    ...basePushPages,
    ...restaurantPushPages,
    ...restaurantAdminPushPages,
  ];

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
    if (typeof window === "undefined") return;
    const token = getAccessToken();
    if (!token) {
      router.replace("/login?next=/platform-admin");
      setPlatformGate("redirected");
      return;
    }
    const payload = decodeJwtPayload(token);
    const role = payload?.role;
    if (role === "PLATFORM_ADMIN") {
      setPlatformGate("allowed");
      return;
    }
    if (role === "RESTAURANT_ADMIN") {
      adminApi
        .getMyRestaurants()
        .then((list) => {
          const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
          if (first?.id) {
            router.replace(`/restaurant-admin/${first.id}`);
          } else {
            router.replace("/profile");
          }
        })
        .catch(() => {
          router.replace("/profile");
        });
      setPlatformGate("redirected");
      return;
    }
    if (role === "COURIER") {
      router.replace("/courier");
      setPlatformGate("redirected");
      return;
    }
    router.replace("/profile");
    setPlatformGate("redirected");
  }, [router]);

  useEffect(() => {
    if (platformGate !== "allowed") return;
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
  }, [platformGate]);

  useEffect(() => {
    if (activeTab !== "users") return;
    setPushSubscribersLoading(true);
    adminApi
      .getPushSubscribersCustomers()
      .then((list) => setPushSubscribersCustomers(Array.isArray(list) ? list : []))
      .catch(() => setPushSubscribersCustomers([]))
      .finally(() => setPushSubscribersLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "applications") return;
    setPartnershipApplicationsLoading(true);
    adminApi
      .getPartnershipApplications()
      .then((list) => setPartnershipApplications(Array.isArray(list) ? list : []))
      .catch(() => setPartnershipApplications([]))
      .finally(() => setPartnershipApplicationsLoading(false));
  }, [activeTab]);

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
    try {
      const [stats, restaurants, users, recentOrders, banners, productCategories] =
        await Promise.all([
          adminApi.getOverviewStats(),
          adminApi.getOverviewRestaurants({ limit: 20, offset: 0 }),
          adminApi.getOverviewUsers({ limit: 20, offset: 0 }),
          adminApi.getOverviewRecentOrders({ limit: 20, offset: 0 }),
          adminApi.getBanners(),
          adminApi.getProductCategories(),
        ]);
      return { stats, restaurants, users, recentOrders, banners, productCategories } as any;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      const looksForbidden =
        msg.includes("403") || /forbidden|only platform admin/i.test(msg);
      if (msg.includes("401")) {
        clearAuthTokens();
        router.push("/login?next=/profile");
      } else if (looksForbidden) {
        router.push("/profile");
      }
      throw e;
    }
  }

  function getStats() {
    if (data?.stats) return data.stats;
    const restaurants = data?.restaurants ?? [];
    const users = data?.users ?? [];
    const orders = data?.recentOrders ?? [];
    const totalOrders = orders.length;
    const delivered = orders.filter((o: any) => o.status === "DONE").length;
    const cancelled = orders.filter((o: any) => o.status === "CANCELLED").length;
    const admins = users.filter(
      (u: any) =>
        u.role === "PLATFORM_ADMIN" || u.role === "RESTAURANT_ADMIN" || u.role === "COURIER",
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

  const editingRestaurant =
    editingRestaurantId && data?.restaurants
      ? data.restaurants.find((x: any) => x.id === editingRestaurantId) ?? null
      : null;

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
      setCreateError("Login kiritilishi shart");
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

  function startEditRestaurant(r: any) {
    setEditingRestaurantId(r.id);
    setEditRestaurantForm({
      name: String(r.name ?? ""),
      description: String(r.description ?? ""),
      imageUrl: String(r.logoUrl || r.coverUrl || ""),
      platformFeePercent: String(r.platformFeePercent ?? 10),
      isFeatured: !!r.isFeatured,
      featuredSortOrder: String(r.featuredSortOrder ?? 0),
      carouselNational: !!r.carouselNational,
      carouselNationalSort: String(r.carouselNationalSort ?? 0),
      carouselFastFood: !!r.carouselFastFood,
      carouselFastFoodSort: String(r.carouselFastFoodSort ?? 0),
    });
  }

  async function saveEditRestaurant(restaurantId: string) {
    setEditSubmitting(true);
    setError(null);
    try {
      const platformFee = Number(editRestaurantForm.platformFeePercent);
      const featuredOrder = Number(editRestaurantForm.featuredSortOrder);
      const natSort = Number(editRestaurantForm.carouselNationalSort);
      const fastSort = Number(editRestaurantForm.carouselFastFoodSort);
      const updated = await adminApi.updateRestaurant(restaurantId, {
        name: editRestaurantForm.name.trim() || undefined,
        description: editRestaurantForm.description.trim() || undefined,
        logoUrl: editRestaurantForm.imageUrl.trim() || undefined,
        coverUrl: editRestaurantForm.imageUrl.trim() || undefined,
        platformFeePercent: Number.isFinite(platformFee) ? platformFee : undefined,
        isFeatured: editRestaurantForm.isFeatured,
        featuredSortOrder: Number.isFinite(featuredOrder) ? featuredOrder : 0,
        carouselNational: editRestaurantForm.carouselNational,
        carouselNationalSort: Number.isFinite(natSort) ? natSort : 0,
        carouselFastFood: editRestaurantForm.carouselFastFood,
        carouselFastFoodSort: Number.isFinite(fastSort) ? fastSort : 0,
      });
      setData((prev: any) =>
        prev
          ? {
              ...prev,
              restaurants: prev.restaurants.map((x: any) => (x.id === restaurantId ? { ...x, ...updated } : x)),
            }
          : prev,
      );
      setEditingRestaurantId(null);
    } catch (err: any) {
      setError(err?.message ?? "Restoranni yangilashda xatolik");
    } finally {
      setEditSubmitting(false);
    }
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

  async function handleUploadBannerImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setBannerImageUploading(true);
    setBannerError(null);
    try {
      const { url } = await adminApi.uploadImage(file);
      setBannerImageUrl(url);
    } catch (err: any) {
      setBannerError(err?.message ?? "Yuklashda xatolik");
    } finally {
      setBannerImageUploading(false);
    }
  }

  async function handleUploadExistingBannerImage(bannerId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setBannerError(null);
    try {
      const { url } = await adminApi.uploadImage(file);
      await handleUpdateBanner(bannerId, { imageUrl: url });
    } catch (err: any) {
      setBannerError(err?.message ?? "Yuklashda xatolik");
    }
  }

  async function handleCreateBanner(e: React.FormEvent) {
    e.preventDefault();
    setBannerError(null);
    setBannerSubmitting(true);
    try {
      const created = await adminApi.createBanner({
        ...(bannerTitle.trim() ? { title: bannerTitle.trim() } : {}),
        text: bannerText.trim() || undefined,
        imageUrl: bannerImageUrl.trim() || undefined,
        ctaLabel: bannerCtaLabel.trim() || undefined,
        ctaHref: bannerCtaHref.trim() || undefined,
        sortOrder: bannerSortOrder ? Number(bannerSortOrder) : undefined,
        isActive: true,
      });
      setBanners((prev) => [created, ...prev]);
      setBannerTitle("");
      setBannerText("");
      setBannerImageUrl("");
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
    { id: "applications", label: "Arizalar" },
    { id: "push", label: "Push xabar yuborish" },
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

  if (platformGate === "checking" || platformGate === "redirected") {
    return (
      <div className="fd-shell fd-section fd-platform-admin-page">
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

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
              <button
                type="button"
                className="fd-admin-sidebar-back-link fd-admin-sidebar-logout"
                onClick={async () => {
                  await logoutWithRefreshToken();
                  setTabsOpen(false);
                  router.push("/login?next=/platform-admin");
                }}
              >
                Chiqish
              </button>
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
        <>
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
                      <div>#{o?.shortCode != null ? String(o.shortCode).padStart(4, "0") : String(o.id).slice(0, 4)}</div>
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
                <div className="fd-card" style={{ padding: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    Push obunasi bor mijozlar
                  </div>
                  {pushSubscribersLoading ? (
                    <p className="fd-checkout-meta" style={{ margin: 0 }}>Yuklanmoqda…</p>
                  ) : pushSubscribersCustomers.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pushSubscribersCustomers.map((u) => (
                        <div key={u.id} className="fd-checkout-meta" style={{ margin: 0 }}>
                          {u.email} · buyurtmalar: {u.ordersCount} · push: {u.pushSubscriptionsCount}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="fd-checkout-meta" style={{ margin: 0 }}>
                      Push obunasi bor mijozlar topilmadi.
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  <button
                    type="button"
                    className={userSubTab === "customers" ? "fd-btn fd-btn-primary" : "fd-btn"}
                    onClick={() => setUserSubTab("customers")}
                  >
                    Oddiy foydalanuvchilar
                  </button>
                  <button
                    type="button"
                    className={userSubTab === "admins" ? "fd-btn fd-btn-primary" : "fd-btn"}
                    onClick={() => setUserSubTab("admins")}
                  >
                    Adminlar
                  </button>
                  <button
                    type="button"
                    className={userSubTab === "couriers" ? "fd-btn fd-btn-primary" : "fd-btn"}
                    onClick={() => setUserSubTab("couriers")}
                  >
                    Kuryerlar
                  </button>
                </div>
                {(data.users ?? [])
                  .filter((u: any) => {
                    const role = String(u?.role ?? "");
                    if (userSubTab === "couriers") return role === "COURIER";
                    if (userSubTab === "admins") return role === "RESTAURANT_ADMIN" || role === "PLATFORM_ADMIN";
                    return role === "CUSTOMER";
                  })
                  .map((u: any) => (
                  <div key={u.id} className="fd-checkout-item">
                    <div>
                      <div>{u.email}</div>
                      <div className="fd-checkout-meta">
                        {u.name} · {u.role}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                      <select
                        value={u.role}
                        onChange={(e) => changeUserRole(u.id, e.target.value)}
                      >
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="RESTAURANT_ADMIN">RESTAURANT_ADMIN</option>
                        <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
                        <option value="COURIER">COURIER</option>
                      </select>
                      <button
                        type="button"
                        className="fd-btn fd-btn--secondary"
                        style={{ padding: "6px 12px", fontSize: "0.875rem" }}
                        onClick={async () => {
                          if (!confirm(`"${u.email}" foydalanuvchisini o‘chirishni xohlaysizmi?`)) return;
                          try {
                            await adminApi.deleteUser(u.id);
                            setData((prev: any) => prev ? { ...prev, users: prev.users.filter((x: any) => x.id !== u.id) } : null);
                          } catch (err: any) {
                            alert(err?.message ?? "O‘chirishda xatolik");
                          }
                        }}
                      >
                        O‘chirish
                      </button>
                    </div>
                  </div>
                  ))}
                {((data.users ?? []).filter((u: any) => {
                  const role = String(u?.role ?? "");
                  if (userSubTab === "couriers") return role === "COURIER";
                  if (userSubTab === "admins") return role === "RESTAURANT_ADMIN" || role === "PLATFORM_ADMIN";
                  return role === "CUSTOMER";
                }).length === 0) && (
                  <p className="fd-empty">Foydalanuvchilar yo‘q.</p>
                )}
              </section>
            </div>

            <div
              className={`fd-admin-panel ${activeTab === "restaurants" ? "fd-admin-panel-active" : ""}`}
            >
              <section>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0 }}>Barcha restoranlar</h2>
                  <button
                    type="button"
                    className="fd-btn fd-btn-primary"
                    onClick={() => setShowCreateRestaurantForm((v) => !v)}
                  >
                    {showCreateRestaurantForm ? "Formani yopish" : "Yangi restoran qo‘shish"}
                  </button>
                </div>
                <p className="fd-checkout-meta" style={{ marginTop: 8, marginBottom: 12 }}>
                  Tahrirlash uchun ✏️ tugmasini bosing.
                </p>

                {showCreateRestaurantForm && (
                  <div className="fd-form-block" style={{ marginBottom: 16 }}>
                    <h3>Yangi restoran qo‘shish</h3>
                    <form onSubmit={handleCreateRestaurant} className="fd-form">
                      <label className="fd-field">
                        <span>Restoran nomi *</span>
                        <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Masalan: Osh markazi" required />
                      </label>
                      <label className="fd-field">
                        <span>Tavsif</span>
                        <input value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Qisqacha tavsif" />
                      </label>
                      <label className="fd-field">
                        <span>Rasm</span>
                        <input type="url" value={createImageUrl} onChange={(e) => setCreateImageUrl(e.target.value)} placeholder="URL yoki telefondan yuklang" />
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <input type="file" accept="image/*" id="create-restaurant-image-file" style={{ display: "none" }} onChange={handleUploadCreateImage} />
                          <label htmlFor="create-restaurant-image-file" style={{ margin: 0 }}>
                            <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                              {createImageUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                            </span>
                          </label>
                        </div>
                      </label>
                      <label className="fd-field">
                        <span>Yetkazib berish narxi (so‘m)</span>
                        <input type="number" min={0} value={createFee} onChange={(e) => setCreateFee(e.target.value)} placeholder="0" />
                      </label>
                      <label className="fd-field">
                        <span>Platforma ulushi (%)</span>
                        <input type="number" min={0} max={100} step={0.5} value={createPlatformFeePercent} onChange={(e) => setCreatePlatformFeePercent(e.target.value)} placeholder="10" />
                      </label>
                      <p className="fd-checkout-meta" style={{ marginTop: 8, marginBottom: 4 }}>
                        Restoran admini (ushbu login va parol bilan kiradi) *
                      </p>
                      <label className="fd-field">
                        <span>Login *</span>
                        <input type="text" value={createAdminEmail} onChange={(e) => setCreateAdminEmail(e.target.value)} placeholder="admin@restoran.uz" required />
                      </label>
                      <label className="fd-field">
                        <span>Admin paroli * (kamida 6 belgi)</span>
                        <input type="password" value={createAdminPassword} onChange={(e) => setCreateAdminPassword(e.target.value)} placeholder="••••••" minLength={6} required />
                      </label>
                      <label className="fd-field">
                        <span>Admin ismi *</span>
                        <input value={createAdminName} onChange={(e) => setCreateAdminName(e.target.value)} placeholder="Ism Familiya" required />
                      </label>
                      {createError && <p style={{ color: "var(--color-orange)", fontSize: "0.875rem" }}>{createError}</p>}
                      <button type="submit" className="fd-btn fd-btn-primary" disabled={createSubmitting || createImageUploading}>
                        {createSubmitting ? "Saqlanmoqda..." : "Restoran qo‘shish"}
                      </button>
                    </form>
                  </div>
                )}

                <div className="fd-grid fd-grid--2 fd-grid--mobile-2">
                  {data.restaurants?.map((r: any) => (
                    <div key={r.id} className="fd-card" style={{ padding: 8, position: "relative" }}>
                      <button
                        type="button"
                        className="fd-btn"
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          width: 30,
                          height: 30,
                          padding: 0,
                          borderRadius: 999,
                          zIndex: 2,
                          fontSize: "0.95rem",
                          lineHeight: 1,
                        }}
                        onClick={() => (editingRestaurantId === r.id ? setEditingRestaurantId(null) : startEditRestaurant(r))}
                        title="Tahrirlash"
                        aria-label="Tahrirlash"
                      >
                        ✏️
                      </button>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <img
                          src={imageUrl(r.logoUrl || r.coverUrl || "")}
                          alt=""
                          style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", background: "#f2f2f2" }}
                          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{r.name}</div>
                          <div className="fd-checkout-meta">{r.description || "Tavsif yo‘q"}</div>
                        </div>
                        <div style={{ width: 30, height: 30, flexShrink: 0 }} />
                      </div>

                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        <Link
                          href={`/platform-admin/restaurants/${r.id}`}
                          className="fd-btn fd-btn-primary"
                          style={{ textDecoration: "none", padding: "8px 12px", fontSize: "0.875rem" }}
                        >
                          Menyu
                        </Link>
                        <button
                          type="button"
                          className="fd-btn"
                          style={{ padding: "8px 12px", fontSize: "0.875rem" }}
                          onClick={async () => {
                            try {
                              await adminApi.deleteRestaurant(r.id);
                              setData((prev: any) =>
                                prev
                                  ? { ...prev, restaurants: prev.restaurants.filter((x: any) => x.id !== r.id) }
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

                      {false && (
                        <div className="fd-form-block" style={{ marginTop: 12 }}>
                          <h3 style={{ marginTop: 0 }}>Restoranni tahrirlash</h3>
                          <div className="fd-form">
                            <label className="fd-field">
                              <span>Nomi</span>
                              <input value={editRestaurantForm.name} onChange={(e) => setEditRestaurantForm((p) => ({ ...p, name: e.target.value }))} />
                            </label>
                            <label className="fd-field">
                              <span>Tavsif</span>
                              <input value={editRestaurantForm.description} onChange={(e) => setEditRestaurantForm((p) => ({ ...p, description: e.target.value }))} />
                            </label>
                            <label className="fd-field">
                              <span>Rasm URL</span>
                              <input value={editRestaurantForm.imageUrl} onChange={(e) => setEditRestaurantForm((p) => ({ ...p, imageUrl: e.target.value }))} />
                            </label>
                            <label className="fd-field">
                              <span>Platforma %</span>
                              <input type="number" min={0} max={100} step={0.5} value={editRestaurantForm.platformFeePercent} onChange={(e) => setEditRestaurantForm((p) => ({ ...p, platformFeePercent: e.target.value }))} />
                            </label>
                            {!r.isSupermarket && (
                              <>
                                <label className="fd-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <input type="checkbox" checked={editRestaurantForm.isFeatured} onChange={(e) => setEditRestaurantForm((p) => ({ ...p, isFeatured: e.target.checked }))} />
                                  <span>Top karuselda</span>
                                </label>
                                {editRestaurantForm.isFeatured && (
                                  <label className="fd-field">
                                    <span>Tartib</span>
                                    <input type="number" min={0} value={editRestaurantForm.featuredSortOrder} onChange={(e) => setEditRestaurantForm((p) => ({ ...p, featuredSortOrder: e.target.value }))} />
                                  </label>
                                )}
                              </>
                            )}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <input
                                type="text"
                                placeholder="Admin login (tayinlash)"
                                value={addAdminEmails[r.id] ?? ""}
                                onChange={(e) => setAddAdminEmails((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                style={{ width: 180, padding: "8px 10px", fontSize: "0.875rem" }}
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
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                              <button type="button" className="fd-btn fd-btn-primary" disabled={editSubmitting} onClick={() => saveEditRestaurant(r.id)}>
                                {editSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                              </button>
                              <button type="button" className="fd-btn" onClick={() => setEditingRestaurantId(null)}>
                                Bekor qilish
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                      Do‘kon admini (ushbu login va parol bilan kirib, shu do‘kon admin paneliga o‘tadi) *
                    </p>
                    <label className="fd-field">
                      <span>Login *</span>
                      <input
                        type="text"
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

                <h3 style={{ marginTop: 16 }}>Mavjud supermarketlar</h3>
                <div className="fd-grid fd-grid--2 fd-grid--mobile-2">
                  {(data.restaurants ?? [])
                    .filter((x: any) => !!x.isSupermarket)
                    .map((r: any) => (
                      <div key={r.id} className="fd-card" style={{ padding: 8, position: "relative" }}>
                        <button
                          type="button"
                          className="fd-btn"
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            width: 30,
                            height: 30,
                            padding: 0,
                            borderRadius: 999,
                            zIndex: 2,
                            fontSize: "0.95rem",
                            lineHeight: 1,
                          }}
                          onClick={() =>
                            editingRestaurantId === r.id ? setEditingRestaurantId(null) : startEditRestaurant(r)
                          }
                          title="Tahrirlash"
                          aria-label="Tahrirlash"
                        >
                          ✏️
                        </button>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <img
                            src={imageUrl(r.logoUrl || r.coverUrl || "")}
                            alt=""
                            style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", background: "#f2f2f2" }}
                            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{r.name}</div>
                            <div className="fd-checkout-meta" style={{ fontSize: "0.82rem" }}>
                              {r.description || "Tavsif yo‘q"}
                            </div>
                          </div>
                          <div style={{ width: 30, height: 30, flexShrink: 0 }} />
                        </div>

                        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                          <Link
                            href={`/platform-admin/restaurants/${r.id}`}
                            className="fd-btn fd-btn-primary"
                            style={{ textDecoration: "none", padding: "8px 12px", fontSize: "0.875rem" }}
                          >
                            Menyu
                          </Link>
                          <button
                            type="button"
                            className="fd-btn"
                            style={{ padding: "8px 12px", fontSize: "0.875rem" }}
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
                                setError(err?.message ?? "Supermarketni o‘chirishda xatolik");
                              }
                            }}
                          >
                            O‘chirish
                          </button>
                        </div>

                        {false && (
                          <div className="fd-form-block" style={{ marginTop: 12 }}>
                            <h3 style={{ marginTop: 0 }}>Supermarketni tahrirlash</h3>
                            <div className="fd-form">
                              <label className="fd-field">
                                <span>Nomi</span>
                                <input
                                  value={editRestaurantForm.name}
                                  onChange={(e) =>
                                    setEditRestaurantForm((p) => ({ ...p, name: e.target.value }))
                                  }
                                />
                              </label>
                              <label className="fd-field">
                                <span>Tavsif</span>
                                <input
                                  value={editRestaurantForm.description}
                                  onChange={(e) =>
                                    setEditRestaurantForm((p) => ({ ...p, description: e.target.value }))
                                  }
                                />
                              </label>
                              <label className="fd-field">
                                <span>Rasm URL</span>
                                <input
                                  value={editRestaurantForm.imageUrl}
                                  onChange={(e) =>
                                    setEditRestaurantForm((p) => ({ ...p, imageUrl: e.target.value }))
                                  }
                                />
                              </label>
                              <label className="fd-field">
                                <span>Platforma %</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.5}
                                  value={editRestaurantForm.platformFeePercent}
                                  onChange={(e) =>
                                    setEditRestaurantForm((p) => ({ ...p, platformFeePercent: e.target.value }))
                                  }
                                />
                              </label>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                <input
                                  type="text"
                                  placeholder="Admin login (tayinlash)"
                                  value={addAdminEmails[r.id] ?? ""}
                                  onChange={(e) =>
                                    setAddAdminEmails((prev) => ({ ...prev, [r.id]: e.target.value }))
                                  }
                                  style={{ width: 180, padding: "8px 10px", fontSize: "0.875rem" }}
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
                              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <button
                                  type="button"
                                  className="fd-btn fd-btn-primary"
                                  disabled={editSubmitting}
                                  onClick={() => saveEditRestaurant(r.id)}
                                >
                                  {editSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                                </button>
                                <button
                                  type="button"
                                  className="fd-btn"
                                  onClick={() => setEditingRestaurantId(null)}
                                >
                                  Bekor qilish
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
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
              className={`fd-admin-panel ${activeTab === "push" ? "fd-admin-panel-active" : ""}`}
            >
              <section>
                <h2>Push xabar yuborish</h2>
                <p className="fd-checkout-meta">
                  Brauzerda push bildirishnomalariga yozilgan foydalanuvchilarga umumiy xabar yuborish.
                </p>
                <form
                  className="fd-form"
                  style={{ marginTop: 16, maxWidth: 520 }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setPushResult(null);
                    setPushSending(true);
                    try {
                      const res = await adminApi.sendPush({
                        title: pushTitle.trim(),
                        message: pushMessage.trim(),
                        url: pushUrl.trim() || "/",
                      });
                      setPushResult(
                        `Yuborildi: ${res.success} ta muvaffaqiyatli, ${res.failed} ta xatolik.`,
                      );
                    } catch (err: any) {
                      setPushResult(err?.message ?? "Xabar yuborishda xatolik.");
                    } finally {
                      setPushSending(false);
                    }
                  }}
                >
                  <label className="fd-field">
                    <span>Sarlavha</span>
                    <input
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                      placeholder="Masalan: 🔥 Yangi aksiya"
                      required
                    />
                  </label>
                  <label className="fd-field">
                    <span>Xabar matni</span>
                    <textarea
                      value={pushMessage}
                      onChange={(e) => setPushMessage(e.target.value)}
                      placeholder="Bugun barcha burgerlarga 30% chegirma"
                      rows={3}
                      required
                    />
                  </label>
                  <label className="fd-field">
                    <span>URL (bosilganda ochiladigan sahifa)</span>
                    <select
                      value={pushUrl}
                      onChange={(e) => setPushUrl(e.target.value)}
                    >
                      {pushPageOptions.map((p) => (
                        <option key={p.url} value={p.url}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {pushResult && (
                    <p
                      className="fd-checkout-meta"
                      style={{ marginTop: 8, color: pushResult.includes("xatolik") ? "var(--color-orange)" : "var(--color-success, #16a34a)" }}
                    >
                      {pushResult}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="fd-btn fd-btn-primary"
                    disabled={pushSending}
                    style={{ marginTop: 12 }}
                  >
                    {pushSending ? "Yuborilmoqda…" : "Yuborish"}
                  </button>
                </form>
              </section>
            </div>

            <div
              className={`fd-admin-panel ${activeTab === "applications" ? "fd-admin-panel-active" : ""}`}
            >
              <section>
                <h2>Hamkorlik arizalari</h2>
                {partnershipApplicationsLoading && <p>Yuklanmoqda...</p>}
                {!partnershipApplicationsLoading && partnershipApplications.length === 0 && (
                  <p className="fd-empty">Hozircha arizalar yo&apos;q.</p>
                )}
                {!partnershipApplicationsLoading &&
                  partnershipApplications.map((a) => (
                    <div key={a.id} className="fd-card" style={{ padding: 12, marginTop: 10 }}>
                      <div style={{ fontWeight: 700 }}>{a.businessName}</div>
                      <div className="fd-checkout-meta">
                        {a.name} · {a.phone}
                      </div>
                      {(a.businessType || a.contactMethod) && (
                        <div className="fd-checkout-meta" style={{ marginTop: 4 }}>
                          {a.businessType ? `Turi: ${a.businessType}` : ""}
                          {a.businessType && a.contactMethod ? " · " : ""}
                          {a.contactMethod ? `Bog'lanish: ${a.contactMethod}` : ""}
                        </div>
                      )}
                      {a.details && (
                        <p className="fd-checkout-meta" style={{ marginTop: 6 }}>
                          {a.details}
                        </p>
                      )}
                      <div className="fd-checkout-meta" style={{ marginTop: 6 }}>
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
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
                    boshqarishingiz mumkin. Rasm va sarlavha ixtiyoriy — matn rasm bilan birga
                    ko‘rinadi.
                  </p>

                  <form onSubmit={handleCreateBanner} className="fd-form" style={{ marginTop: 16 }}>
                    <label className="fd-field">
                      <span>Sarlavha (ixtiyoriy)</span>
                      <input
                        value={bannerTitle}
                        onChange={(e) => setBannerTitle(e.target.value)}
                        placeholder="Masalan: Chegirma 30%"
                      />
                    </label>
                    <label className="fd-field">
                      <span>Matn</span>
                      <textarea
                        value={bannerText}
                        onChange={(e) => setBannerText(e.target.value)}
                        placeholder="Banner ostidagi qisqacha matn (ixtiyoriy)"
                        rows={3}
                        style={{ minHeight: 72, resize: "vertical" }}
                      />
                    </label>
                    <label className="fd-field">
                      <span>Banner rasmi</span>
                      <input
                        type="url"
                        value={bannerImageUrl}
                        onChange={(e) => setBannerImageUrl(e.target.value)}
                        placeholder="Supabase/storage URL yoki telefondan yuklang"
                      />
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                          type="file"
                          accept="image/*"
                          id="create-banner-image-file"
                          style={{ display: "none" }}
                          onChange={handleUploadBannerImage}
                        />
                        <label htmlFor="create-banner-image-file" style={{ margin: 0 }}>
                          <span className="fd-btn fd-btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
                            {bannerImageUploading ? "Yuklanmoqda..." : "Telefondan yuklash"}
                          </span>
                        </label>
                      </div>
                      {bannerImageUrl.trim() && (
                        <img
                          src={imageUrl(bannerImageUrl.trim())}
                          alt="Banner"
                          style={{
                            marginTop: 8,
                            maxWidth: "100%",
                            maxHeight: 140,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid var(--color-border)",
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
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
                      disabled={bannerSubmitting || bannerImageUploading}
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
                        <div className="fd-admin-kpi-value">{b.title?.trim() ? b.title : "—"}</div>
                        {b.text && (
                          <div className="fd-admin-kpi-sub">{b.text}</div>
                        )}
                        {b.imageUrl ? (
                          <img
                            src={imageUrl(String(b.imageUrl))}
                            alt=""
                            style={{
                              marginTop: 8,
                              width: "100%",
                              maxHeight: 100,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1px solid var(--color-border)",
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}
                        <label className="fd-field" style={{ marginTop: 10, marginBottom: 0 }}>
                          <span className="fd-checkout-meta">Rasm URL</span>
                          <input
                            key={`${b.id}-${b.imageUrl ?? ""}`}
                            type="url"
                            defaultValue={b.imageUrl ?? ""}
                            placeholder="Bo‘sh qoldiring — rasm yo‘q"
                            style={{ fontSize: "0.85rem" }}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              const cur = (b.imageUrl as string | null | undefined) ?? "";
                              if (v === cur) return;
                              handleUpdateBanner(b.id, { imageUrl: v ? v : null });
                            }}
                          />
                        </label>
                        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            type="file"
                            accept="image/*"
                            id={`banner-image-file-${b.id}`}
                            style={{ display: "none" }}
                            onChange={(e) => handleUploadExistingBannerImage(b.id, e)}
                          />
                          <label htmlFor={`banner-image-file-${b.id}`} style={{ margin: 0 }}>
                            <span className="fd-btn" style={{ cursor: "pointer", display: "inline-block", fontSize: "0.85rem", padding: "6px 12px" }}>
                              Rasm yuklash
                            </span>
                          </label>
                        </div>
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

          {editingRestaurant && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                zIndex: 1100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setEditingRestaurantId(null);
              }}
            >
              <div
                className="fd-form-block"
                style={{
                  width: "min(720px, 96vw)",
                  maxHeight: "88vh",
                  overflowY: "auto",
                  margin: 0,
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  {editingRestaurant.isSupermarket ? "Supermarketni tahrirlash" : "Restoranni tahrirlash"}
                </h3>
                <div className="fd-form">
                  <label className="fd-field">
                    <span>Nomi</span>
                    <input
                      value={editRestaurantForm.name}
                      onChange={(e) => setEditRestaurantForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </label>
                  <label className="fd-field">
                    <span>Tavsif</span>
                    <input
                      value={editRestaurantForm.description}
                      onChange={(e) => setEditRestaurantForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </label>
                  <label className="fd-field">
                    <span>Rasm URL</span>
                    <input
                      value={editRestaurantForm.imageUrl}
                      onChange={(e) => setEditRestaurantForm((p) => ({ ...p, imageUrl: e.target.value }))}
                    />
                  </label>
                  <label className="fd-field">
                    <span>Platforma %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={editRestaurantForm.platformFeePercent}
                      onChange={(e) =>
                        setEditRestaurantForm((p) => ({ ...p, platformFeePercent: e.target.value }))
                      }
                    />
                  </label>
                  {!editingRestaurant.isSupermarket && (
                    <>
                      <p className="fd-card-desc" style={{ margin: "8px 0 4px" }}>
                        Bosh sahifa karusellari (hech biri belgilanmasa — avtomatik ro‘yxat ishlatiladi).
                      </p>
                      <label className="fd-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={editRestaurantForm.carouselNational}
                          onChange={(e) =>
                            setEditRestaurantForm((p) => ({ ...p, carouselNational: e.target.checked }))
                          }
                        />
                        <span>«Milliy taomlar» karuselida</span>
                      </label>
                      {editRestaurantForm.carouselNational && (
                        <label className="fd-field">
                          <span>Tartib (0 = birinchi)</span>
                          <input
                            type="number"
                            min={0}
                            value={editRestaurantForm.carouselNationalSort}
                            onChange={(e) =>
                              setEditRestaurantForm((p) => ({ ...p, carouselNationalSort: e.target.value }))
                            }
                          />
                        </label>
                      )}
                      <label className="fd-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={editRestaurantForm.carouselFastFood}
                          onChange={(e) =>
                            setEditRestaurantForm((p) => ({ ...p, carouselFastFood: e.target.checked }))
                          }
                        />
                        <span>«Fast food» karuselida</span>
                      </label>
                      {editRestaurantForm.carouselFastFood && (
                        <label className="fd-field">
                          <span>Tartib (0 = birinchi)</span>
                          <input
                            type="number"
                            min={0}
                            value={editRestaurantForm.carouselFastFoodSort}
                            onChange={(e) =>
                              setEditRestaurantForm((p) => ({ ...p, carouselFastFoodSort: e.target.value }))
                            }
                          />
                        </label>
                      )}
                      <label className="fd-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={editRestaurantForm.isFeatured}
                          onChange={(e) =>
                            setEditRestaurantForm((p) => ({ ...p, isFeatured: e.target.checked }))
                          }
                        />
                        <span>Zaxira: «Top» ro‘yxati (Milliy karusel bo‘sh bo‘lsa)</span>
                      </label>
                      {editRestaurantForm.isFeatured && (
                        <label className="fd-field">
                          <span>Top tartib</span>
                          <input
                            type="number"
                            min={0}
                            value={editRestaurantForm.featuredSortOrder}
                            onChange={(e) =>
                              setEditRestaurantForm((p) => ({ ...p, featuredSortOrder: e.target.value }))
                            }
                          />
                        </label>
                      )}
                    </>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Admin login (tayinlash)"
                      value={addAdminEmails[editingRestaurant.id] ?? ""}
                      onChange={(e) =>
                        setAddAdminEmails((prev) => ({ ...prev, [editingRestaurant.id]: e.target.value }))
                      }
                      style={{ width: 220, padding: "8px 10px", fontSize: "0.875rem" }}
                    />
                    <button
                      type="button"
                      className="fd-btn"
                      disabled={
                        !(addAdminEmails[editingRestaurant.id] ?? "").trim() ||
                        addAdminSubmitting[editingRestaurant.id]
                      }
                      onClick={async () => {
                        const email = (addAdminEmails[editingRestaurant.id] ?? "").trim();
                        if (!email) return;
                        setAddAdminSubmitting((prev) => ({ ...prev, [editingRestaurant.id]: true }));
                        try {
                          await adminApi.addRestaurantAdmin(editingRestaurant.id, email);
                          setAddAdminEmails((prev) => ({ ...prev, [editingRestaurant.id]: "" }));
                        } catch (err: any) {
                          setError(err?.message ?? "Xatolik");
                        } finally {
                          setAddAdminSubmitting((prev) => ({ ...prev, [editingRestaurant.id]: false }));
                        }
                      }}
                    >
                      {addAdminSubmitting[editingRestaurant.id] ? "..." : "Adminni tayinlash"}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      className="fd-btn fd-btn-primary"
                      disabled={editSubmitting}
                      onClick={() => saveEditRestaurant(editingRestaurant.id)}
                    >
                      {editSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                    </button>
                    <button type="button" className="fd-btn" onClick={() => setEditingRestaurantId(null)}>
                      Bekor qilish
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
