"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BackLink } from "../../components/BackLink";
import { adminApi } from "../../lib/adminApi";

function formatSum(n: number) {
  return `${new Intl.NumberFormat("uz-UZ").format(Math.round(n))} so'm`;
}

type CourierTab = "yangi" | "mine";

function PoolOrderCard({
  o,
  actionBusy,
  loading,
  onTake,
  onOnTheWay,
  onDone,
  onError,
}: {
  o: any;
  actionBusy: boolean;
  loading: boolean;
  onTake: (id: string) => Promise<void>;
  onOnTheWay: (id: string) => Promise<void>;
  onDone: (id: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const name = o.restaurant?.name ?? "Restoran";
  const total = formatSum(Number(o.total));
  const lat = o.address?.latitude;
  const lng = o.address?.longitude;
  const mapUrl =
    typeof lat === "number" && typeof lng === "number"
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : o.address?.street
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [o.address.street, o.address.city].filter(Boolean).join(", "),
          )}`
        : null;

  return (
    <div className="fd-card" style={{ padding: 14 }}>
      <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 10 }}>{name}</div>
      {o.status === "READY" && !o.courierId && (
        <button
          type="button"
          className="fd-btn fd-btn-primary"
          style={{ width: "100%" }}
          disabled={actionBusy || loading}
          onClick={async () => {
            try {
              await onTake(o.id);
            } catch (e: any) {
              onError(e?.message ?? "Xatolik");
            }
          }}
        >
          Buyurtmani olish
        </button>
      )}
      {o.status === "READY" && !!o.courierId && (
        <button
          type="button"
          className="fd-btn fd-btn-primary"
          style={{ width: "100%" }}
          disabled={actionBusy || loading}
          onClick={async () => {
            try {
              await onOnTheWay(o.id);
            } catch (e: any) {
              onError(e?.message ?? "Xatolik");
            }
          }}
        >
          Yo‘lda
        </button>
      )}
      {o.status === "ON_THE_WAY" && !!o.courierId && (
        <button
          type="button"
          className="fd-btn fd-btn-primary"
          style={{ width: "100%" }}
          disabled={actionBusy || loading}
          onClick={async () => {
            try {
              await onDone(o.id);
            } catch (e: any) {
              onError(e?.message ?? "Xatolik");
            }
          }}
        >
          Tugatildi
        </button>
      )}
      {!!o.courierId && mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fd-btn"
          style={{ width: "100%", marginTop: 8, display: "inline-block", textDecoration: "none" }}
        >
          Xaritani ochish
        </a>
      )}
      <div style={{ marginTop: 10, fontWeight: 700, color: "var(--color-muted)" }}>{total}</div>
    </div>
  );
}

function orderStatusNorm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
}

function FullOrderCard({
  o,
  actionBusy,
  loading,
  onOnTheWay,
  onDone,
  onError,
}: {
  o: any;
  actionBusy: boolean;
  loading: boolean;
  onOnTheWay: (id: string) => Promise<void>;
  onDone: (id: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const lat = o.address?.latitude;
  const lng = o.address?.longitude;
  const mapUrl =
    typeof lat === "number" && typeof lng === "number"
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : null;

  // «Mening buyurtmalarim» — barcha yozuvlar allaqachon shu kuryerga tegishli; courierId tekshiruvi kerak emas.
  const st = orderStatusNorm(o.status);
  const showOnTheWayBtn = st === "READY";
  const showDeliveredBtn = st === "ON_THE_WAY" || st === "IN_PATH";

  return (
    <div className="fd-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <strong>#{String(o.id).slice(0, 8)}</strong>
          <span className="fd-checkout-meta" style={{ marginLeft: 8 }}>
            {o.status}
          </span>
        </div>
        <div style={{ fontWeight: 700 }}>{formatSum(Number(o.total))}</div>
      </div>
      <p className="fd-checkout-meta" style={{ margin: "8px 0 4px" }}>
        {o.restaurant?.name ?? "Restoran"}
      </p>
      <p className="fd-checkout-meta">
        Mijoz: {o.customer?.name ?? "—"}
        {o.customer?.phone ? ` · ${o.customer.phone}` : ""}
      </p>
      {o.address?.details && (
        <p className="fd-checkout-meta" style={{ marginTop: 4 }}>
          {o.address.details}
        </p>
      )}
      <p className="fd-checkout-meta" style={{ marginTop: 4 }}>
        {o.address?.street}, {o.address?.city}
      </p>
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fd-btn fd-btn-primary"
          style={{ marginTop: 10, display: "inline-block", textDecoration: "none" }}
        >
          Xaritada ochish
        </a>
      )}
      {Array.isArray(o.items) && o.items.length > 0 && (
        <ul className="fd-checkout-meta" style={{ margin: "10px 0 0", paddingLeft: 18 }}>
          {o.items.map((it: any) => (
            <li key={it.id}>
              {it.dish?.name ?? "Taom"} × {it.quantity} — {formatSum(Number(it.price) * it.quantity)}
            </li>
          ))}
        </ul>
      )}
      {showOnTheWayBtn && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--color-border, #e8e8e8)" }}>
          <button
            type="button"
            className="fd-btn fd-btn-primary"
            style={{ width: "100%" }}
            disabled={actionBusy || loading}
            onClick={async () => {
              try {
                await onOnTheWay(o.id);
              } catch (e: any) {
                onError(e?.message ?? "Xatolik");
              }
            }}
          >
            Yo‘lda
          </button>
        </div>
      )}
      {showDeliveredBtn && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--color-border, #e8e8e8)" }}>
          <button
            type="button"
            className="fd-btn fd-btn-primary"
            style={{ width: "100%" }}
            disabled={actionBusy || loading}
            onClick={async () => {
              try {
                await onDone(o.id);
              } catch (e: any) {
                onError(e?.message ?? "Xatolik");
              }
            }}
          >
            Yetkazildi
          </button>
        </div>
      )}
    </div>
  );
}

export default function CourierPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CourierTab>("yangi");
  const [actionBusy, setActionBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [ordersLastSyncAt, setOrdersLastSyncAt] = useState<string | null>(null);
  const listLimit = 300;
  const listOffset = 0;

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await adminApi.getCourierOrders({
        limit: listLimit,
        offset: listOffset,
        scope: tab === "mine" ? "mine" : "pool",
      });
      setOrders(Array.isArray(list) ? list : []);
      const latest = (Array.isArray(list) ? list : [])
        .map((o: any) => String(o?.updatedAt ?? o?.createdAt ?? ""))
        .filter(Boolean)
        .sort()
        .pop();
      if (latest) setOrdersLastSyncAt(latest);
    } catch (e: any) {
      const msg = String(e?.message ?? "Xatolik");
      setError(msg);
      const low = msg.toLowerCase();
      if (low.includes("unauthorized") || low.includes("missing authorization")) {
        router.push("/login?next=/courier");
      }
      if (low.includes("forbidden") || low.includes("faqat kuryerlar")) {
        router.push("/profile");
      }
    } finally {
      setLoading(false);
    }
  }, [router, tab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      router.push("/login?next=/courier");
      return;
    }
    adminApi
      .getMyPushStatus()
      .then((s) => setPushEnabled(!!s.subscribed))
      .catch(() => setPushEnabled(null));
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem("token")) return;
    setLoading(true);
    load();
  }, [tab, load]);

  useEffect(() => {
    let inFlight = false;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (actionBusy) return;
      if (loading) return;
      if (inFlight) return;
      inFlight = true;
      adminApi
        .getCourierOrdersChanges({
          scope: tab === "mine" ? "mine" : "pool",
          since: ordersLastSyncAt ?? undefined,
        })
        .then((meta) => {
          if (meta?.lastUpdatedAt) setOrdersLastSyncAt(meta.lastUpdatedAt);
          if (!meta?.changed) return;
          return load();
        })
        .finally(() => {
          inFlight = false;
        });
    }, 15000);
    return () => clearInterval(interval);
  }, [load, actionBusy, loading, tab, ordersLastSyncAt]);

  async function handleTake(id: string) {
    setActionBusy(true);
    try {
      await adminApi.takeOrder(id);
      await load();
    } finally {
      setActionBusy(false);
    }
  }

  async function handleOnTheWay(id: string) {
    setActionBusy(true);
    try {
      await adminApi.updateOrderStatus(id, "ON_THE_WAY");
      await load();
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDone(id: string) {
    setActionBusy(true);
    try {
      await adminApi.updateOrderStatus(id, "DONE");
      await load();
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="fd-shell fd-section">
      <BackLink href="/profile" />
      <h1 className="fd-section-title">Kuryer paneli</h1>
      {pushEnabled === false && (
        <div className="fd-card" style={{ padding: 16, marginTop: 12 }}>
          <p className="fd-card-desc" style={{ margin: 0 }}>
            Bildirishnomalar yoqilmagan. Buyurtmalarni qabul qilish uchun profilda pushni yoqing.
          </p>
          <div style={{ marginTop: 12, display: "flex" }}>
            <Link href="/profile" className="fd-btn fd-btn-primary" style={{ textDecoration: "none" }}>
              Bildirishnomani yoqish
            </Link>
          </div>
        </div>
      )}
      <p className="fd-card-desc" style={{ marginBottom: 16 }}>
        {tab === "yangi"
          ? "Umumiy ro‘yxat: faqat restoran, narx va buyurtmani olish. Batafsil — «Mening buyurtmalarim»."
          : "Siz olgan buyurtmalar — manzil, taomlar va xarita shu yerda."}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" className="fd-btn fd-btn-primary" onClick={() => load()} disabled={loading}>
          {loading ? "Yuklanmoqda…" : "Yangilash"}
        </button>
        <Link href="/profile" className="fd-btn" style={{ textDecoration: "none" }}>
          Profil
        </Link>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          type="button"
          className={tab === "yangi" ? "fd-btn fd-btn-primary" : "fd-btn"}
          onClick={() => setTab("yangi")}
        >
          Yangi
        </button>
        <button
          type="button"
          className={tab === "mine" ? "fd-btn fd-btn-primary" : "fd-btn"}
          onClick={() => setTab("mine")}
        >
          Mening buyurtmalarim
        </button>
      </div>
      {error && <p className="fd-empty">{error}</p>}
      {!loading && !error && orders.length === 0 && <p className="fd-empty">Buyurtmalar yo‘q.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tab === "yangi"
          ? orders.map((o) => (
              <PoolOrderCard
                key={o.id}
                o={o}
                actionBusy={actionBusy}
                loading={loading}
                onTake={handleTake}
                onOnTheWay={handleOnTheWay}
                onDone={handleDone}
                onError={setError}
              />
            ))
          : orders.map((o) => (
              <FullOrderCard
                key={o.id}
                o={o}
                actionBusy={actionBusy}
                loading={loading}
                onOnTheWay={handleOnTheWay}
                onDone={handleDone}
                onError={setError}
              />
            ))}
      </div>
    </div>
  );
}
