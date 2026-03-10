"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "../../lib/adminApi";

export default function PlatformAdminPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        setError(err.message ?? "Ошибка загрузки");
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

    if (!res.ok) throw new Error("Ошибка ответа сервера");
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
              users: prev.users.map((u: any) => (u.id === id ? { ...u, role: updated.role } : u)),
            }
          : prev,
      );
    } catch (err: any) {
      setError(err.message ?? "Рольни yangilashda xatolik");
    }
  }

  return (
    <div className="fd-shell fd-section">
      <h1 className="fd-section-title">Platforma admin paneli</h1>
      <p className="fd-checkout-meta">
        PLATFORM_ADMIN JWT tokeni kerak (uni /login sahifasidan olish mumkin).
      </p>
      {loading && <p>Yuklanmoqda...</p>}
      {error && <p className="fd-empty">{error}</p>}
      {data && (
        <>
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
                      Yetkazilgan: {s.delivered} · Bekor qilingan: {s.cancelled}
                    </div>
                  </div>
                </>
              );
            })()}
          </section>

          <div className="fd-platform-grid">
            <section>
              <h2>Restoranlar</h2>
              {data.restaurants?.map((r: any) => (
                <div key={r.id} className="fd-checkout-item">
                  <div>
                    <div>{r.name}</div>
                    <div className="fd-checkout-meta">{r.address}</div>
                  </div>
                </div>
              ))}
              {(!data.restaurants || data.restaurants.length === 0) && (
                <p className="fd-empty">Restoranlar topilmadi.</p>
              )}
            </section>

            <section>
              <h2>Foydalanuvchilar</h2>
              {data.users?.map((u: any) => (
                <div key={u.id} className="fd-checkout-item">
                  <div>
                    <div>{u.email}</div>
                    <div className="fd-checkout-meta">
                      {u.name} · роль: {u.role}
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
                <p className="fd-empty">Foydalanuvchilar topilmadi.</p>
              )}
            </section>

            <section>
              <h2>So‘nggi buyurtmalar</h2>
              {data.recentOrders?.map((o: any) => (
                <div key={o.id} className="fd-checkout-item">
                  <div>
                    <div>#{o.id.slice(0, 6)}</div>
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
