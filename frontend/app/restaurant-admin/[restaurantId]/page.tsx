"use client";

import { useEffect, useState } from "react";
import { adminApi } from "../../../lib/adminApi";
import { BackLink } from "../../../components/BackLink";

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
      <BackLink href="/profile">← Profil</BackLink>
      <h1 className="fd-section-title">Restoran buyurtmalari</h1>
      {loading && <p>Yuklanmoqda...</p>}
      {error && <p className="fd-empty">{error}</p>}
      <div className="fd-admin-orders">
        {orders.map((o) => {
          const addr = o.address;
          const hasCoords = addr && (addr.latitude != null || addr.longitude != null) && (Number(addr.latitude) !== 0 || Number(addr.longitude) !== 0);
          const mapUrl = hasCoords
            ? `https://www.google.com/maps?q=${Number(addr.latitude)},${Number(addr.longitude)}`
            : addr?.street
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([addr.street, addr.city].filter(Boolean).join(", "))}`
              : null;
          return (
            <div key={o.id} className="fd-card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <strong>#{o.id.slice(0, 8)}</strong>
                  <span style={{ marginLeft: 8, fontSize: "0.875rem", color: "var(--color-muted)" }}>{o.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="fd-btn fd-btn-primary"
                    type="button"
                    onClick={() => changeStatus(o.id, "ACCEPTED")}
                  >
                    Qabul qilish
                  </button>
                  <button
                    className="fd-btn"
                    type="button"
                    onClick={() => changeStatus(o.id, "DELIVERED")}
                  >
                    Yetkazildi
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="fd-card-desc" style={{ fontWeight: 600, marginBottom: 6 }}>Buyurtma (taomlar):</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.9rem" }}>
                  {(o.items ?? []).map((oi: any, idx: number) => (
                    <li key={oi.id ?? idx}>
                      {oi.dish?.name ?? "—"} × {oi.quantity} = {(Number(oi.price) * oi.quantity).toLocaleString()} so&apos;m
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 8, fontSize: "0.875rem", color: "var(--color-muted)" }}>
                  <span>Subtotal: {Number(o.subtotal ?? 0).toLocaleString()} so&apos;m</span>
                  {Number(o.deliveryFee ?? 0) > 0 && (
                    <span> · Yetkazib berish: {Number(o.deliveryFee).toLocaleString()} so&apos;m</span>
                  )}
                  {Number(o.serviceFee ?? 0) > 0 && (
                    <span> · Xizmat: {Number(o.serviceFee).toLocaleString()} so&apos;m</span>
                  )}
                  <div style={{ fontWeight: 600, marginTop: 4 }}>Jami: {Number(o.total).toLocaleString()} so&apos;m</div>
                </div>
              </div>

              {addr && (
                <div style={{ marginTop: 12 }}>
                  <div className="fd-card-desc" style={{ fontWeight: 600, marginBottom: 4 }}>Manzil:</div>
                  <p className="fd-card-desc" style={{ margin: 0 }}>
                    {addr.street}
                    {addr.city ? `, ${addr.city}` : ""}
                    {addr.details ? ` · ${addr.details}` : ""}
                  </p>
                  {o.comment && (
                    <p className="fd-card-desc" style={{ margin: "4px 0 0 0" }}>Izoh: {o.comment}</p>
                  )}
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fd-btn"
                      style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 18 }}>location_on</span>
                      Xaritada ko&apos;rish
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {orders.length === 0 && !loading && !error && (
          <p className="fd-empty">Buyurtmalar yo‘q.</p>
        )}
      </div>
    </div>
  );
}
