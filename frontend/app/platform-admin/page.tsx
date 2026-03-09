"use client";

import { useEffect, useState } from "react";
import { adminApi } from "../../lib/adminApi";

export default function PlatformAdminPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // adminApi пока не знает про overview, используем прямой вызов
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
    if (!res.ok) throw new Error("Ошибка ответа сервера");
    return (await res.json()) as any;
  }

  return (
    <div className="fd-shell fd-section">
      <h1 className="fd-section-title">Платформенная админ-панель</h1>
      <p className="fd-checkout-meta">
        Требуется JWT токен PLATFORM_ADMIN в localStorage (получить можно на
        странице /login).
      </p>
      {loading && <p>Загрузка...</p>}
      {error && <p className="fd-empty">{error}</p>}
      {data && (
        <div className="fd-platform-grid">
          <section>
            <h2>Рестораны</h2>
            {data.restaurants?.map((r: any) => (
              <div key={r.id} className="fd-checkout-item">
                <div>
                  <div>{r.name}</div>
                  <div className="fd-checkout-meta">{r.address}</div>
                </div>
              </div>
            ))}
            {(!data.restaurants || data.restaurants.length === 0) && (
              <p className="fd-empty">Рестораны не найдены.</p>
            )}
          </section>

          <section>
            <h2>Пользователи</h2>
            {data.users?.map((u: any) => (
              <div key={u.id} className="fd-checkout-item">
                <div>
                  <div>{u.email}</div>
                  <div className="fd-checkout-meta">
                    {u.name} · роль: {u.role}
                  </div>
                </div>
              </div>
            ))}
            {(!data.users || data.users.length === 0) && (
              <p className="fd-empty">Пользователи не найдены.</p>
            )}
          </section>

          <section>
            <h2>Последние заказы</h2>
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
              <p className="fd-empty">Заказов нет.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
