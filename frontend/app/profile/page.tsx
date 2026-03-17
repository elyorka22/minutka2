"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "../../components/BackLink";
import { adminApi } from "../../lib/adminApi";
import { API_BASE } from "../../lib/api";

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
};

function decodeToken(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

type MyRestaurant = { id: string; name: string };

export default function ProfilePage() {
  const [payload, setPayload] = useState<JwtPayload | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [myRestaurants, setMyRestaurants] = useState<MyRestaurant[]>([]);
  const [myRestaurantsError, setMyRestaurantsError] = useState(false);
  const [myRestaurantsLoading, setMyRestaurantsLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("token");
    if (!token) return;
    setHasToken(true);
    setPayload(decodeToken(token));
  }, []);

  useEffect(() => {
    if (!hasToken || payload?.role !== "RESTAURANT_ADMIN") return;
    let active = true;
    setMyRestaurantsLoading(true);
    setMyRestaurantsError(false);
    adminApi
      .getMyRestaurants()
      .then((list) => {
        if (active && Array.isArray(list)) setMyRestaurants(list);
        if (active) setMyRestaurantsError(false);
      })
      .catch(() => {
        if (active) setMyRestaurantsError(true);
      })
      .finally(() => {
        if (active) setMyRestaurantsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasToken, payload?.role]);

  const role = payload?.role;

  async function handleEnablePush() {
    setPushStatus(null);
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      setPushStatus("Bildirishnomalar brauzeringizda qo‘llab-quvvatlanmaydi.");
      return;
    }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setPushStatus("Push kaliti topilmadi (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
      return;
    }
    try {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") {
        setPushStatus("Bildirishnomalarga ruxsat berilmadi.");
        return;
      }
      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ??
        (await navigator.serviceWorker.ready);
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setPushStatus("Bildirishnomalar allaqachon yoqilgan.");
        return;
      }
      const urlBase64ToUint8Array = (base64: string) => {
        const padding = "=".repeat((4 - (base64.length % 4)) % 4);
        const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = window.atob(base64Safe);
        const output = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          output[i] = raw.charCodeAt(i);
        }
        return output;
      };
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch(`${API_BASE.replace(/\/$/, "")}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setPushStatus("Bildirishnomalar muvaffaqiyatli yoqildi.");
    } catch {
      setPushStatus("Bildirishnomalarni yoqishda xatolik yuz berdi.");
    }
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("token");
    }
    setHasToken(false);
    setPayload(null);
    setMyRestaurants([]);
    router.push("/");
  }

  const isPlatformAdmin = role === "PLATFORM_ADMIN";
  const isRestaurantAdmin = role === "RESTAURANT_ADMIN";

  return (
    <div className="fd-shell fd-section">
      <BackLink href="/" />
      <h1 className="fd-section-title">Profil</h1>

      {!hasToken && (
        <div className="fd-card" style={{ padding: 16 }}>
          <p className="fd-card-desc">
            Oddiy foydalanuvchi sifatida buyurtma berishingiz mumkin. Alohida avtorizatsiya talab
            qilinmaydi.
          </p>
          <p className="fd-card-desc">
            Agar siz restoran yoki platforma administratori bo&apos;lsangiz, quyidagi tugma orqali
            tizimga kirib, admin panellariga o&apos;tishingiz mumkin.
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/login" className="fd-btn fd-btn-primary">
              Kirish (adminlar uchun)
            </Link>
            <Link href="/register" className="fd-btn">
              Ro‘yxatdan o‘tish (adminlar uchun)
            </Link>
          </div>
        </div>
      )}

      {hasToken && (
        <div className="fd-card" style={{ padding: 16, marginTop: 8 }}>
          <p className="fd-card-desc">Email: {payload?.email ?? "nomalum"}</p>
          <p className="fd-card-desc">Rol: {role ?? "CUSTOMER"}</p>

          <button
            type="button"
            className="fd-btn fd-btn-primary"
            style={{ marginTop: 8, marginRight: 8 }}
            onClick={handleEnablePush}
          >
            Bildirishnomalarni yoqish
          </button>

          <button
            type="button"
            className="fd-btn"
            style={{ marginTop: 8 }}
            onClick={handleLogout}
          >
            Chiqish
          </button>

          {pushStatus && (
            <p className="fd-card-desc" style={{ marginTop: 8, fontSize: "0.875rem" }}>
              {pushStatus}
            </p>
          )}

          {isPlatformAdmin && (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/platform-admin" className="fd-btn fd-btn-primary">
                Platforma admin paneli
              </Link>
            </div>
          )}

          {isRestaurantAdmin && (
            <div style={{ marginTop: 12 }}>
              {myRestaurantsLoading && (
                <p className="fd-card-desc">Restoranlar yuklanmoqda…</p>
              )}
              {!myRestaurantsLoading && myRestaurantsError && (
                <p className="fd-card-desc" style={{ color: "var(--color-orange)" }}>
                  Sessiya tugadi yoki xatolik. <strong>Chiqish</strong> tugmasini bosing va qayta kiring.
                </p>
              )}
              {!myRestaurantsLoading && !myRestaurantsError && myRestaurants.length === 0 && (
                <p className="fd-card-desc" style={{ color: "var(--color-muted)" }}>
                  Sizga hozircha restoran yoki do‘kon tayinlanmagan. Platforma adminiga murojaat qiling.
                </p>
              )}
              {!myRestaurantsLoading && !myRestaurantsError && myRestaurants.length > 0 && (
                <>
                  <p className="fd-card-desc" style={{ marginBottom: 8 }}>
                    Sizning restoran/do‘konlaringiz — admin paneliga o‘ting:
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {myRestaurants.map((r) => (
                      <Link
                        key={r.id}
                        href={`/restaurant-admin/${r.id}`}
                        className="fd-btn fd-btn-primary"
                        style={{ textDecoration: "none", textAlign: "center" }}
                      >
                        {r.name} — buyurtmalar
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {!isPlatformAdmin && !isRestaurantAdmin && (
            <p className="fd-card-desc" style={{ marginTop: 12 }}>
              Siz oddiy mijoz sifatida buyurtma berishingiz mumkin, admin paneli faqat maxsus
              rollar uchun ochiladi.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

