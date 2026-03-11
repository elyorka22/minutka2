"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi } from "../../lib/adminApi";
import { imageUrl } from "../../lib/api";
import { BackLink } from "../../components/BackLink";

type TabId = "stats" | "restaurants" | "users" | "orders";

export default function PlatformAdminPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("restaurants");
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

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const overview = await fetchOverview();
        if (!active) return;
        setData(overview);
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

  async function handleCreateRestaurant(e: React.FormEvent) {
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
      });
      setCreateName("");
      setCreateAddress("");
      setCreateDesc("");
      setCreateFee("");
      const overview = await fetchOverview();
      setData(overview);
      setActiveTab("restaurants");
    } catch (err: any) {
      setCreateError(err.message ?? "Restoran qo‘shishda xatolik");
    } finally {
      setCreateSubmitting(false);
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "stats", label: "Statistika" },
    { id: "restaurants", label: "Restoranlar" },
    { id: "users", label: "Foydalanuvchilar" },
    { id: "orders", label: "Buyurtmalar" },
  ];

  return (
    <div className="fd-shell fd-section">
      <BackLink href="/profile">← Profil</BackLink>
      <h1 className="fd-section-title">Platforma admin paneli</h1>
      {loading && <p>Yuklanmoqda...</p>}
      {error && <p className="fd-empty">{error}</p>}
      {data && (
        <>
          <nav className="fd-admin-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`fd-admin-tab ${activeTab === t.id ? "fd-admin-tab-active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

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
                  <Link
                    href={`/platform-admin/restaurants/${r.id}`}
                    className="fd-btn fd-btn-primary"
                    style={{ textDecoration: "none", flexShrink: 0 }}
                  >
                    Menyu
                  </Link>
                </div>
              ))}
              {(!data.restaurants || data.restaurants.length === 0) && (
                <p className="fd-empty">Restoranlar yo‘q. Yuqoridagi formadan qo‘shing.</p>
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
            className={`fd-admin-panel ${activeTab === "orders" ? "fd-admin-panel-active" : ""}`}
          >
            <section>
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
        </>
      )}
    </div>
  );
}
