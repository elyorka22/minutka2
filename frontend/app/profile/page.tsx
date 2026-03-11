"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function ProfilePage() {
  const [payload, setPayload] = useState<JwtPayload | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [restaurantId, setRestaurantId] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("token");
    if (!token) return;
    setHasToken(true);
    setPayload(decodeToken(token));
  }, []);

  const role = payload?.role;

  function goToRestaurantAdmin() {
    if (!restaurantId.trim()) return;
    router.push(`/restaurant-admin/${restaurantId.trim()}`);
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

          {isPlatformAdmin && (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/platform-admin" className="fd-btn fd-btn-primary">
                Platforma admin paneli
              </Link>
            </div>
          )}

          {isRestaurantAdmin && (
            <div className="fd-form" style={{ marginTop: 12 }}>
              <p className="fd-card-desc">
                Restoran admin paneliga o&apos;tish uchun restoran ID ni kiriting.
              </p>
              <label className="fd-field">
                <span>Restoran ID</span>
                <input
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
                  placeholder="Masalan: abc123"
                />
              </label>
              <button
                type="button"
                className="fd-btn fd-btn-primary"
                onClick={goToRestaurantAdmin}
                disabled={!restaurantId.trim()}
              >
                Restoran admin paneliga o&apos;tish
              </button>
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

