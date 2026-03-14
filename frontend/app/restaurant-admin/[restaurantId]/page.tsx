"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "../../../lib/adminApi";
import { BackLink } from "../../../components/BackLink";

type TabId = "orders" | "archive" | "payments" | "stats";

function OrderCard({
  o,
  onStatusChange,
  showStatusButtons = true,
}: {
  o: any;
  onStatusChange?: (id: string, status: string) => void;
  showStatusButtons?: boolean;
}) {
  const addr = o.address;
  const hasCoords =
    addr &&
    (addr.latitude != null || addr.longitude != null) &&
    (Number(addr.latitude) !== 0 || Number(addr.longitude) !== 0);
  const mapUrl = hasCoords
    ? `https://www.google.com/maps?q=${Number(addr.latitude)},${Number(addr.longitude)}`
    : addr?.street
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [addr.street, addr.city].filter(Boolean).join(", "),
        )}`
      : null;
  return (
    <div key={o.id} className="fd-card" style={{ padding: 16, marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <strong>#{o.id.slice(0, 8)}</strong>
          <span style={{ marginLeft: 8, fontSize: "0.875rem", color: "var(--color-muted)" }}>{o.status}</span>
        </div>
        {showStatusButtons && onStatusChange && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="fd-btn fd-btn-primary"
              type="button"
              onClick={() => onStatusChange(o.id, "ACCEPTED")}
            >
              Qabul qilish
            </button>
            <button className="fd-btn" type="button" onClick={() => onStatusChange(o.id, "DELIVERED")}>
              Yetkazildi
            </button>
          </div>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="fd-card-desc" style={{ fontWeight: 600, marginBottom: 6 }}>
          Buyurtma (taomlar):
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.9rem" }}>
          {(o.items ?? []).map((oi: any, idx: number) => (
            <li key={oi.id ?? idx}>
              {oi.dish?.name ?? "—"} × {oi.quantity} ={" "}
              {(Number(oi.price) * oi.quantity).toLocaleString()} so&apos;m
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
          <div className="fd-card-desc" style={{ fontWeight: 600, marginBottom: 4 }}>
            Manzil:
          </div>
          <p className="fd-card-desc" style={{ margin: 0 }}>
            {addr.street}
            {addr.city ? `, ${addr.city}` : ""}
            {addr.details ? ` · ${addr.details}` : ""}
          </p>
          {o.comment && (
            <p className="fd-card-desc" style={{ margin: "4px 0 0 0" }}>
              Izoh: {o.comment}
            </p>
          )}
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="fd-btn"
              style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                location_on
              </span>
              Xaritada ko&apos;rish
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function RestaurantAdminPage({
  params,
}: { params: { restaurantId: string } }) {
  const restaurantId = params.restaurantId;
  const [activeTab, setActiveTab] = useState<TabId>("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    activeOrdersCount: number;
    deliveredOrdersCount: number;
    totalRevenue: number;
    platformFeePercent: number;
    totalPlatformFee: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadOrders() {
    setLoading(true);
    setError(null);
    adminApi
      .getRestaurantOrders(restaurantId)
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err?.message ?? "Xatolik"))
      .finally(() => setLoading(false));
  }

  function loadArchive() {
    setLoading(true);
    setError(null);
    adminApi
      .getRestaurantOrdersArchive(restaurantId)
      .then((data) => setArchive(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err?.message ?? "Xatolik"))
      .finally(() => setLoading(false));
  }

  function loadStats() {
    setLoading(true);
    setError(null);
    adminApi
      .getRestaurantStats(restaurantId)
      .then(setStats)
      .catch((err: any) => setError(err?.message ?? "Xatolik"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (activeTab === "orders") loadOrders();
    else if (activeTab === "archive") loadArchive();
    else if (activeTab === "stats") loadStats();
    else if (activeTab === "payments") {
      setLoading(true);
      setError(null);
      Promise.all([
        adminApi.getRestaurantStats(restaurantId),
        adminApi.getRestaurantOrdersArchive(restaurantId),
      ])
        .then(([s, a]) => {
          setStats(s);
          setArchive(Array.isArray(a) ? a : []);
        })
        .catch((err: any) => setError(err?.message ?? "Xatolik"))
        .finally(() => setLoading(false));
    }
  }, [restaurantId, activeTab]);

  async function changeStatus(id: string, status: string) {
    try {
      await adminApi.updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch (err) {
      console.error(err);
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "orders", label: "Buyurtmalar" },
    { id: "archive", label: "Arxiv" },
    { id: "payments", label: "Platforma to'lovlari" },
    { id: "stats", label: "Statistika" },
  ];

  const deliveredForPayments = (activeTab === "payments" ? archive : []).filter((o: any) => o.status === "DELIVERED");
  const percent = stats?.platformFeePercent ?? 10;

  return (
    <div className="fd-shell fd-section">
      <BackLink href="/profile">← Profil</BackLink>
      <h1 className="fd-section-title">Restoran boshqaruvi</h1>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === activeTab ? "fd-btn fd-btn-primary" : "fd-btn"}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p>Yuklanmoqda...</p>}
      {error && (
        <div className="fd-empty">
          <p>{error}</p>
          {(error.includes("tayinlangan") || error.includes("restoran") || error.includes("do'kon")) && (
            <p style={{ marginTop: 12 }}>
              <Link href="/profile" className="fd-btn fd-btn-primary" style={{ textDecoration: "none" }}>
                Profilga o‘tish
              </Link>
            </p>
          )}
        </div>
      )}

      {activeTab === "orders" && !loading && (
        <div className="fd-admin-orders">
          {orders.map((o) => (
            <OrderCard key={o.id} o={o} onStatusChange={changeStatus} showStatusButtons />
          ))}
          {orders.length === 0 && !error && <p className="fd-empty">Aktiv buyurtmalar yo‘q.</p>}
        </div>
      )}

      {activeTab === "archive" && !loading && (
        <div className="fd-admin-orders">
          <p className="fd-checkout-meta" style={{ marginBottom: 12 }}>
            Yetkazilgan va bekor qilingan buyurtmalar (oxirgi 3 kun). 3 kundan keyin avtomatik o‘chiriladi.
          </p>
          {archive.map((o) => (
            <OrderCard key={o.id} o={o} showStatusButtons={false} />
          ))}
          {archive.length === 0 && !error && <p className="fd-empty">Arxiv bo‘sh.</p>}
        </div>
      )}

      {activeTab === "payments" && !loading && (
        <div>
          {stats != null && (
            <div className="fd-card" style={{ padding: 16, marginBottom: 16 }}>
              <p className="fd-card-desc">
                Platforma ulushi: <strong>{stats.platformFeePercent}%</strong> (har bir yetkazilgan buyurtma uchun).
                Jami platformaga to‘langan: <strong>{Number(stats.totalPlatformFee).toLocaleString()} so&apos;m</strong>.
              </p>
            </div>
          )}
          <div className="fd-card-desc" style={{ fontWeight: 600, marginBottom: 8 }}>
            Yetkazilgan buyurtmalar bo‘yicha platforma to‘lovi
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {deliveredForPayments.map((o: any) => {
              const fee = (Number(o.total) * percent) / 100;
              return (
                <li key={o.id} style={{ marginBottom: 6 }}>
                  #{o.id.slice(0, 8)} — {Number(o.total).toLocaleString()} so&apos;m × {percent}% ={" "}
                  {fee.toLocaleString()} so&apos;m
                </li>
              );
            })}
          </ul>
          {deliveredForPayments.length === 0 && !error && (
            <p className="fd-empty">Hozircha yetkazilgan buyurtmalar yo‘q.</p>
          )}
        </div>
      )}

      {activeTab === "stats" && !loading && stats != null && (
        <div className="fd-card" style={{ padding: 16 }}>
          <p className="fd-card-desc">
            <strong>Aktiv buyurtmalar:</strong> {stats.activeOrdersCount}
          </p>
          <p className="fd-card-desc">
            <strong>Yetkazilgan buyurtmalar:</strong> {stats.deliveredOrdersCount}
          </p>
          <p className="fd-card-desc">
            <strong>Jami daromad (yetkazilgan):</strong> {Number(stats.totalRevenue).toLocaleString()} so&apos;m
          </p>
          <p className="fd-card-desc">
            <strong>Platforma ulushi:</strong> {stats.platformFeePercent}%
          </p>
          <p className="fd-card-desc">
            <strong>Platformaga to‘langan:</strong> {Number(stats.totalPlatformFee).toLocaleString()} so&apos;m
          </p>
        </div>
      )}
    </div>
  );
}
