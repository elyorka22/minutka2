"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "../../components/BackLink";
import { adminApi } from "../../lib/adminApi";

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
    adminApi
      .getMyRestaurants()
      .then((list) => {
        if (active && Array.isArray(list)) setMyRestaurants(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hasToken, payload?.role]);

  const role = payload?.role;

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
            className="fd-btn"
            style={{ marginTop: 8 }}
            onClick={handleLogout}
          >
            Chiqish
          </button>

          {isPlatformAdmin && (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/platform-admin" className="fd-btn fd-btn-primary">
                Platforma admin paneli
              </Link>
            </div>
          )}

          {isRestaurantAdmin && (
            <div style={{ marginTop: 12 }}>
              {myRestaurants.length > 0 ? (
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
              ) : (
                <p className="fd-card-desc">
                  Sizga tayinlangan restoran yoki do‘kon yo‘q. Platforma admini bilan bog‘laning.
                </p>
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

