"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "../../../lib/adminApi";

type TabId = "orders" | "archive" | "stats";

function OrderCard({
  o,
  onStatusChange,
  onArchive,
  showStatusButtons = true,
}: {
  o: any;
  onStatusChange?: (id: string, status: string, cancelReason?: string) => void;
  onArchive?: (order: any) => void;
  showStatusButtons?: boolean;
}) {
  const displayCode = o?.shortCode != null ? String(o.shortCode).padStart(6, "0") : String(o.id).slice(0, 6);
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
          <strong>#{displayCode}</strong>
          <span style={{ marginLeft: 8, fontSize: "0.875rem", color: "var(--color-muted)" }}>{o.status}</span>
        </div>
        {showStatusButtons && onStatusChange && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {o.status === "NEW" && (
              <button
                className="fd-btn fd-btn-primary"
                type="button"
                style={{ fontSize: "0.82rem", padding: "6px 10px", lineHeight: 1.2 }}
                onClick={() => onStatusChange(o.id, "ACCEPTED")}
              >
                Qabul qilish
              </button>
            )}
            {o.status === "ACCEPTED" && (
              <button
                className="fd-btn fd-btn-primary"
                type="button"
                style={{ fontSize: "0.82rem", padding: "6px 10px", lineHeight: 1.2 }}
                onClick={() => onStatusChange(o.id, "READY")}
              >
                Tayyor
              </button>
            )}

            {o.status === "READY" && (
              <span className="fd-checkout-meta" style={{ width: "100%", textAlign: "right", fontSize: "0.78rem" }}>
                Kuryer kutyapti
              </span>
            )}
            {o.status === "ON_THE_WAY" && (
              <span className="fd-checkout-meta" style={{ width: "100%", textAlign: "right", fontSize: "0.78rem" }}>
                Yo‘lda
              </span>
            )}

            {o.status !== "CANCELLED" && o.status !== "DONE" && (
              <button
                className="fd-btn fd-btn--secondary"
                type="button"
                style={{ fontSize: "0.82rem", padding: "6px 10px", lineHeight: 1.2 }}
                onClick={() => {
                  const reason = prompt("Bekor qilish sababi?");
                  if (!reason) return;
                  onStatusChange(o.id, "CANCELLED", reason);
                }}
              >
                Bekor qilish
              </button>
            )}
            {onArchive && (
              <button
                className="fd-btn"
                type="button"
                style={{ fontSize: "0.82rem", padding: "6px 10px", lineHeight: 1.2 }}
                onClick={() => onArchive(o)}
              >
                Arxivga
              </button>
            )}
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
          <div style={{ fontWeight: 600 }}>
            Taomlar jami: {Number(o.subtotal ?? 0).toLocaleString()} so&apos;m
          </div>
          <div style={{ marginTop: 4 }}>
            Platforma ulushi: {Number(o.serviceFee ?? 0).toLocaleString()} so&apos;m
          </div>
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
  const [debtInfo, setDebtInfo] = useState<{ amount: number; percent: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualArchive, setManualArchive] = useState<any[]>([]);
  const [ordersLastSyncAt, setOrdersLastSyncAt] = useState<string | null>(null);

  const manualArchiveKey = `restaurant-admin-manual-archive:${restaurantId}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(manualArchiveKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setManualArchive(Array.isArray(parsed) ? parsed : []);
    } catch {
      setManualArchive([]);
    }
  }, [manualArchiveKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(manualArchiveKey, JSON.stringify(manualArchive));
    } catch {
      // ignore storage issues
    }
  }, [manualArchive, manualArchiveKey]);

  function loadOrders(opts?: { background?: boolean }) {
    const background = !!opts?.background;
    if (!background) setLoading(true);
    setError(null);
    adminApi
      .getRestaurantOrders(restaurantId, {
        limit: 50,
        offset: 0,
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const hiddenIds = new Set(manualArchive.map((x: any) => x?.id));
        setOrders(list.filter((o: any) => !hiddenIds.has(o.id)));
        const latest = list
          .map((o: any) => String(o?.updatedAt ?? o?.createdAt ?? ""))
          .filter(Boolean)
          .sort()
          .pop();
        if (latest) setOrdersLastSyncAt(latest);
      })
      .catch((err: any) => setError(err?.message ?? "Xatolik"))
      .finally(() => {
        if (!background) setLoading(false);
      });
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
      .then((s) => {
        setStats(s);
        setDebtInfo({
          amount: Number(s?.totalPlatformFee ?? 0),
          percent: Number(s?.platformFeePercent ?? 0),
        });
      })
      .catch((err: any) => setError(err?.message ?? "Xatolik"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    adminApi
      .getRestaurantStats(restaurantId)
      .then((s) =>
        setDebtInfo({
          amount: Number(s?.totalPlatformFee ?? 0),
          percent: Number(s?.platformFeePercent ?? 0),
        }),
      )
      .catch(() => setDebtInfo(null));
  }, [restaurantId]);

  useEffect(() => {
    if (activeTab === "orders") loadOrders();
    else if (activeTab === "archive") loadArchive();
    else if (activeTab === "stats") loadStats();

  }, [restaurantId, activeTab, manualArchive]);

  useEffect(() => {
    if (activeTab !== "orders") return;
    let inFlight = false;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (loading) return;
      if (inFlight) return;
      inFlight = true;
      adminApi
        .getRestaurantOrdersChanges(restaurantId, { since: ordersLastSyncAt ?? undefined })
        .then((meta) => {
          if (meta?.lastUpdatedAt) setOrdersLastSyncAt(meta.lastUpdatedAt);
          if (!meta?.changed) return;
          return Promise.resolve(loadOrders({ background: true }));
        })
        .finally(() => {
          inFlight = false;
        });
    }, 12000);
    return () => clearInterval(interval);
  }, [activeTab, loading, restaurantId, manualArchive, ordersLastSyncAt]);

  async function changeStatus(id: string, status: string, cancelReason?: string) {
    try {
      await adminApi.updateOrderStatus(id, status as any, cancelReason);
      setOrders((prev) =>
        status === "CANCELLED" ? prev.filter((o) => o.id !== id) : prev.map((o) => (o.id === id ? { ...o, status } : o)),
      );
    } catch (err) {
      console.error(err);
    }
  }

  function archiveOrder(order: any) {
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    setManualArchive((prev) => {
      if (prev.some((x: any) => x?.id === order.id)) return prev;
      return [{ ...order, _manualArchived: true }, ...prev];
    });
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "orders", label: "Buyurtmalar" },
    { id: "archive", label: "Arxiv" },
    { id: "stats", label: "Statistika" },
  ];
  const mergedArchive = [...manualArchive, ...archive.filter((o) => !manualArchive.some((m: any) => m?.id === o?.id))];

  return (
    <div className="fd-shell fd-section" style={{ marginTop: 10 }}>
      <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <Link href="/profile" className="fd-btn" style={{ textDecoration: "none" }}>
          Profilga qaytish
        </Link>
        <button type="button" className="fd-btn" disabled style={{ cursor: "default" }}>
          {debtInfo
            ? `Platforma qarzi: ${debtInfo.amount.toLocaleString()} so'm (${debtInfo.percent}%)`
            : "Platforma qarzi: —"}
        </button>
      </div>
      <h1 className="fd-section-title">Restoran boshqaruvi</h1>

      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === activeTab ? "fd-btn fd-btn-primary" : "fd-btn"}
            onClick={() => setActiveTab(t.id)}
            style={{ padding: "8px 12px", fontSize: "0.85rem", flexShrink: 0 }}
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
              <OrderCard
                key={o.id}
                o={o}
                onStatusChange={changeStatus}
                onArchive={archiveOrder}
                showStatusButtons
              />
          ))}
          {orders.length === 0 && !error && <p className="fd-empty">Aktiv buyurtmalar yo‘q.</p>}
        </div>
      )}

      {activeTab === "archive" && !loading && (
        <div className="fd-admin-orders">
          <p className="fd-checkout-meta" style={{ marginBottom: 12 }}>
            Yetkazilgan va bekor qilingan buyurtmalar (oxirgi 3 kun). 3 kundan keyin avtomatik o‘chiriladi.
          </p>
          {mergedArchive.map((o) => (
            <OrderCard key={o.id} o={o} showStatusButtons={false} />
          ))}
          {mergedArchive.length === 0 && !error && <p className="fd-empty">Arxiv bo‘sh.</p>}
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
