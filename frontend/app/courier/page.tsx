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

export default function CourierPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CourierTab>("yangi");
  const [actionBusy, setActionBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
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
    const interval = setInterval(() => {
      if (actionBusy) return;
      if (loading) return;
      load();
    }, 8000);
    return () => clearInterval(interval);
  }, [load, actionBusy, loading]);

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
          ? "Barcha faol buyurtmalar: olish mumkin bo‘lgan tayyor buyurtmalar va sizning jarayondagilaringiz."
          : "Siz «Buyurtmani olish» bilan qabul qilgan buyurtmalar — «Yo‘lda» va «Tugatildi» shu yerda."}
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
        {orders.map((o) => {
          const lat = o.address?.latitude;
          const lng = o.address?.longitude;
          const mapUrl =
            typeof lat === "number" && typeof lng === "number"
              ? `https://www.google.com/maps?q=${lat},${lng}`
              : null;
          return (
            <div key={o.id} className="fd-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <strong>#{String(o.id).slice(0, 8)}</strong>
                  <span className="fd-checkout-meta" style={{ marginLeft: 8 }}>
                    {o.status}
                  </span>
                </div>
                <div style={{ fontWeight: 700 }}>{formatSum(Number(o.total))}</div>
              </div>
              {o.status === "READY" && !o.courierId && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="fd-btn fd-btn-primary"
                    disabled={actionBusy || loading}
                    onClick={async () => {
                      try {
                        setActionBusy(true);
                        await adminApi.takeOrder(o.id);
                        await load();
                      } catch (e: any) {
                        setError(e?.message ?? "Xatolik");
                      } finally {
                        setActionBusy(false);
                      }
                    }}
                  >
                    Buyurtmani olish
                  </button>
                </div>
              )}
              {o.status === "READY" && !!o.courierId && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="fd-btn fd-btn-primary"
                    disabled={actionBusy || loading}
                    onClick={async () => {
                      try {
                        setActionBusy(true);
                        await adminApi.updateOrderStatus(o.id, "ON_THE_WAY");
                        await load();
                      } catch (e: any) {
                        setError(e?.message ?? "Xatolik");
                      } finally {
                        setActionBusy(false);
                      }
                    }}
                  >
                    Yo‘lda
                  </button>
                </div>
              )}
              {o.status === "ON_THE_WAY" && !!o.courierId && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="fd-btn fd-btn-primary"
                    disabled={actionBusy || loading}
                    onClick={async () => {
                      try {
                        setActionBusy(true);
                        await adminApi.updateOrderStatus(o.id, "DONE");
                        await load();
                      } catch (e: any) {
                        setError(e?.message ?? "Xatolik");
                      } finally {
                        setActionBusy(false);
                      }
                    }}
                  >
                    Tugatildi
                  </button>
                </div>
              )}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
