"use client";

import { useEffect, useState } from "react";
import { adminApi } from "../../../lib/adminApi";

export default function RestaurantAdminPage({
  params,
}: { params: { restaurantId: string } }) {
  const restaurantId = params.restaurantId;
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const data = await adminApi.getRestaurantOrders(restaurantId);
        if (!active) return;
        setOrders(Array.isArray(data) ? data : []);
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
  }, [restaurantId]);

  async function changeStatus(id: string, status: string) {
    try {
      await adminApi.updateOrderStatus(id, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o)),
      );
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="fd-shell fd-section">
      <h1 className="fd-section-title">Заказы ресторана</h1>
      {loading && <p>Загрузка...</p>}
      {error && <p className="fd-empty">{error}</p>}
      <div className="fd-admin-orders">
        {orders.map((o) => (
          <div key={o.id} className="fd-checkout-item">
            <div>
              <div>#{o.id.slice(0, 6)}</div>
              <div className="fd-checkout-meta">
                {o.items?.length ?? 0} позиций · {o.total} ₽ · {o.status}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="fd-btn fd-btn-primary"
                type="button"
                onClick={() => changeStatus(o.id, "ACCEPTED")}
              >
                Принять
              </button>
              <button
                className="fd-btn"
                type="button"
                onClick={() => changeStatus(o.id, "DELIVERED")}
              >
                Доставлен
              </button>
            </div>
          </div>
        ))}
        {orders.length === 0 && !loading && !error && (
          <p className="fd-empty">Заказов нет.</p>
        )}
      </div>
    </div>
  );
}
