"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "../../lib/adminApi";
import { API_BASE } from "../../lib/api";
import { decodeJwtPayload, type JwtPayload } from "../../lib/jwt";
import { clearAuthTokens, getAccessToken, logoutWithRefreshToken } from "../../lib/auth-tokens";

type MyRestaurant = { id: string; name: string };

export default function ProfilePage() {
  const [payload, setPayload] = useState<JwtPayload | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [myRestaurants, setMyRestaurants] = useState<MyRestaurant[]>([]);
  const [myRestaurantsError, setMyRestaurantsError] = useState(false);
  const [myRestaurantsLoading, setMyRestaurantsLoading] = useState(false);
  const [courierAccess, setCourierAccess] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [credCurrent, setCredCurrent] = useState("");
  const [credNewEmail, setCredNewEmail] = useState("");
  const [credNewPassword, setCredNewPassword] = useState("");
  const [credConfirmPassword, setCredConfirmPassword] = useState("");
  const [credBusy, setCredBusy] = useState(false);
  const [credMessage, setCredMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getAccessToken();
    if (!token) return;
    setHasToken(true);
    setPayload(decodeJwtPayload(token));
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

  useEffect(() => {
    if (!hasToken) return;
    if (payload?.role === "COURIER") {
      setCourierAccess(true);
      return;
    }
    let active = true;
    adminApi
      .getCourierOrders()
      .then(() => {
        if (active) setCourierAccess(true);
      })
      .catch(() => {
        if (active) setCourierAccess(false);
      });
    return () => {
      active = false;
    };
  }, [hasToken, payload?.role]);

  useEffect(() => {
    if (!hasToken) {
      setPushEnabled(null);
      return;
    }
    let active = true;
    adminApi
      .getMyPushStatus()
      .then((s) => {
        if (active) setPushEnabled(!!s?.subscribed);
      })
      .catch(() => {
        if (active) setPushEnabled(false);
      });
    return () => {
      active = false;
    };
  }, [hasToken]);

  const role = payload?.role;
  const roleLabel =
    role === "PLATFORM_ADMIN"
      ? "Platforma admin"
      : role === "RESTAURANT_ADMIN"
        ? "Restoran admin"
        : role === "COURIER"
          ? "Kuryer"
          : "Foydalanuvchi";

  async function handleEnablePush() {
    if (pushBusy) return;
    setPushStatus(null);
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
      setPushStatus("Bildirishnomalar brauzeringizda qo‘llab-quvvatlanmaydi.");
      return;
    }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setPushStatus("Push kaliti topilmadi (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
      return;
    }
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setPushStatus("Push ishlashi uchun HTTPS kerak.");
      return;
    }

    setPushBusy(true);
    setPushStatus("Bildirishnomalar yoqilmoqda…");
    try {
      const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string) => {
        let timeoutId: any;
        const timeout = new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(message)), ms);
        });
        try {
          return await Promise.race([promise, timeout]);
        } finally {
          clearTimeout(timeoutId);
        }
      };

      let permission = Notification.permission;
      if (permission === "default") {
        setPushStatus("Ruxsat so‘ralmoqda…");
        permission = await withTimeout(
          Notification.requestPermission(),
          15000,
          "Ruxsat oynasi ochilmadi. Brauzer sozlamalarini tekshiring."
        );
      }
      if (permission !== "granted") {
        setPushStatus("Bildirishnomalarga ruxsat berilmadi.");
        return;
      }

      setPushStatus("Service worker tekshirilmoqda…");
      const reg = await withTimeout(
        (async () => {
          const direct = await navigator.serviceWorker.getRegistration("/sw.js");
          if (direct) return direct;
          return await navigator.serviceWorker.ready;
        })(),
        15000,
        "Service worker tayyor emas. Sahifani yangilab ko‘ring."
      );
      if (!reg) {
        setPushStatus("Service worker topilmadi. Sahifani yangilab ko‘ring.");
        return;
      }

      setPushStatus("Obuna tekshirilmoqda…");
      const existing = await withTimeout(
        reg.pushManager.getSubscription(),
        10000,
        "Push obuna tekshiruvi javob bermadi."
      );
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

      const sub = existing
        ? existing
        : await withTimeout(
            reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey),
            }),
            20000,
            "Push obunasi yaratilmayapti. Brauzer push-ni qo‘llamasligi mumkin."
          );
      setPushStatus(existing ? "Mavjud obuna ishlatilmoqda…" : "Push obunasi yaratilmoqda…");

      setPushStatus("Serverga saqlanmoqda…");
      const controller = new AbortController();
      const fetchTimeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const token = getAccessToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE.replace(/\/$/, "")}/push/subscribe`, {
          method: "POST",
          headers,
          body: JSON.stringify(sub),
          signal: controller.signal,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `Server xatosi: ${res.status}`);
        }
      } finally {
        clearTimeout(fetchTimeoutId);
      }

      setPushStatus("Bildirishnomalar muvaffaqiyatli yoqildi.");
      setPushEnabled(true);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setPushStatus("Server javob bermadi (timeout). API_BASE noto‘g‘ri bo‘lishi mumkin.");
        return;
      }
      const msg =
        typeof e?.message === "string" && e.message.trim()
          ? e.message.trim()
          : "Bildirishnomalarni yoqishda xatolik yuz berdi.";
      setPushStatus(msg);
    } finally {
      setPushBusy(false);
    }
  }

  async function handleLogout() {
    await logoutWithRefreshToken();
    setHasToken(false);
    setPayload(null);
    setMyRestaurants([]);
    router.push("/");
  }

  async function handleUpdateCredentials(e: FormEvent) {
    e.preventDefault();
    if (credBusy || !hasToken) return;
    setCredMessage(null);
    const emailTrim = credNewEmail.trim();
    const passTrim = credNewPassword.trim();
    if (!emailTrim && !passTrim) {
      setCredMessage("Yangi email yoki yangi parolni kiriting.");
      return;
    }
    if (passTrim && passTrim.length < 8) {
      setCredMessage("Yangi parol kamida 8 belgidan iborat bo‘lishi kerak.");
      return;
    }
    if (passTrim && passTrim !== credConfirmPassword.trim()) {
      setCredMessage("Yangi parollar mos kelmayapti.");
      return;
    }
    if (!credCurrent.trim()) {
      setCredMessage("Joriy parolni kiriting.");
      return;
    }
    setCredBusy(true);
    try {
      await adminApi.updateMyCredentials({
        currentPassword: credCurrent,
        ...(emailTrim ? { newEmail: emailTrim } : {}),
        ...(passTrim ? { newPassword: passTrim } : {}),
      });
      clearAuthTokens();
      setHasToken(false);
      setPayload(null);
      setMyRestaurants([]);
      router.push("/login?credentials=updated");
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message.trim()
          : "Saqlashda xatolik yuz berdi.";
      setCredMessage(msg);
    } finally {
      setCredBusy(false);
    }
  }

  const isPlatformAdmin = role === "PLATFORM_ADMIN";
  const isRestaurantAdmin = role === "RESTAURANT_ADMIN";
  const isCourier = role === "COURIER" || courierAccess;
  const displayName =
    hasToken && role
      ? roleLabel
      : payload?.email
        ? payload.email.split("@")[0]
        : "Mehmon foydalanuvchi";
  const adminAccess = isPlatformAdmin || isRestaurantAdmin || isCourier;
  const myMenuItems = [
    { icon: "📍", label: "Manzillarim", href: "/addresses" },
  ];
  const serviceItems = [
    { icon: "🤝", label: "Hamkorlik", href: "/hamkorlik" },
    { icon: "🎁", label: "Promokodlar", href: "/promocodes" },
    { icon: "🎧", label: "Yordam", href: "/profile" },
  ];

  return (
    <div className="fd-shell fd-section fd-profile-page">
      <section className="fd-profile-hero">
        <div className="fd-profile-avatar" aria-hidden="true">👤</div>
        <div className="fd-profile-hero-body">
          <div className="fd-profile-hero-name">{displayName}</div>
          <div className="fd-profile-hero-sub">
            {hasToken ? roleLabel : "Telefon orqali tez kirish"}
          </div>
          {hasToken && payload?.email ? (
            <div className="fd-profile-hero-meta">{payload.email}</div>
          ) : null}
        </div>
        {!hasToken ? (
          <Link href="/login" className="fd-profile-login-btn">
            Kirish
          </Link>
        ) : (
          <button type="button" className="fd-profile-login-btn" onClick={handleLogout}>
            Chiqish
          </button>
        )}
      </section>

      <section className="fd-profile-group">
        <h2 className="fd-profile-group-title">Mening menyum</h2>
        <div className="fd-profile-list">
          {myMenuItems.map((item) => (
            <Link key={item.label} href={item.href} className="fd-profile-item">
              <span className="fd-profile-item-icon">{item.icon}</span>
              <span className="fd-profile-item-label">{item.label}</span>
              <span className="fd-profile-item-arrow">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="fd-profile-group">
        <div className="fd-profile-list">
          {serviceItems.map((item) => (
            <Link key={item.label} href={item.href} className="fd-profile-item">
              <span className="fd-profile-item-icon">{item.icon}</span>
              <span className="fd-profile-item-label">{item.label}</span>
              <span className="fd-profile-item-arrow">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="fd-profile-group">
        <div className="fd-profile-list">
          <button type="button" className="fd-profile-item fd-profile-item-btn" onClick={handleEnablePush} disabled={pushBusy}>
            <span className="fd-profile-item-icon">🔔</span>
            <span className="fd-profile-item-label">{pushBusy ? "Yoqilmoqda…" : "Bildirishnomalarni yoqish"}</span>
            <span className="fd-profile-item-arrow">›</span>
          </button>
          {pushStatus && <p className="fd-profile-note">{pushStatus}</p>}
        </div>
      </section>

      {hasToken && adminAccess && (
        <section className="fd-profile-group">
          <h2 className="fd-profile-group-title">Login va parol</h2>
          <form className="fd-profile-credentials" onSubmit={handleUpdateCredentials}>
            <p className="fd-profile-note">
              Email yoki parolni almashtirgach, qayta kirishingiz kerak (barcha seanslar yopiladi).
            </p>
            <label className="fd-profile-field">
              <span>Joriy parol</span>
              <input
                type="password"
                autoComplete="current-password"
                value={credCurrent}
                onChange={(ev) => setCredCurrent(ev.target.value)}
                disabled={credBusy}
              />
            </label>
            <label className="fd-profile-field">
              <span>Yangi email (ixtiyoriy)</span>
              <input
                type="email"
                autoComplete="email"
                value={credNewEmail}
                onChange={(ev) => setCredNewEmail(ev.target.value)}
                disabled={credBusy}
                placeholder="o‘zgartirmasangiz bo‘sh qoldiring"
              />
            </label>
            <label className="fd-profile-field">
              <span>Yangi parol (ixtiyoriy)</span>
              <input
                type="password"
                autoComplete="new-password"
                value={credNewPassword}
                onChange={(ev) => setCredNewPassword(ev.target.value)}
                disabled={credBusy}
                placeholder="kamida 8 belgi"
              />
            </label>
            <label className="fd-profile-field">
              <span>Yangi parolni tasdiqlang</span>
              <input
                type="password"
                autoComplete="new-password"
                value={credConfirmPassword}
                onChange={(ev) => setCredConfirmPassword(ev.target.value)}
                disabled={credBusy}
              />
            </label>
            {credMessage ? <p className="fd-profile-note fd-profile-note-error">{credMessage}</p> : null}
            <button type="submit" className="fd-profile-login-btn fd-profile-credentials-submit" disabled={credBusy}>
              {credBusy ? "Saqlanmoqda…" : "Saqlash"}
            </button>
          </form>
        </section>
      )}

      {adminAccess && (
        <section className="fd-profile-group">
          <h2 className="fd-profile-group-title">Admin bo‘limi</h2>
          <div className="fd-profile-list">
            {isPlatformAdmin && (
              <Link href="/platform-admin" className="fd-profile-item">
                <span className="fd-profile-item-icon">🛠️</span>
                <span className="fd-profile-item-label">Platforma admin paneli</span>
                <span className="fd-profile-item-arrow">›</span>
              </Link>
            )}
            {isCourier && (
              <Link href="/courier" className="fd-profile-item">
                <span className="fd-profile-item-icon">🛵</span>
                <span className="fd-profile-item-label">Kuryer paneli</span>
                <span className="fd-profile-item-arrow">›</span>
              </Link>
            )}
            {isRestaurantAdmin && myRestaurants.map((r) => (
              <Link key={r.id} href={`/restaurant-admin/${r.id}`} className="fd-profile-item">
                <span className="fd-profile-item-icon">🏬</span>
                <span className="fd-profile-item-label">{r.name} — admin panel</span>
                <span className="fd-profile-item-arrow">›</span>
              </Link>
            ))}
            {isRestaurantAdmin && myRestaurantsLoading && (
              <p className="fd-profile-note">Restoranlar yuklanmoqda…</p>
            )}
            {isRestaurantAdmin && !myRestaurantsLoading && myRestaurantsError && (
              <p className="fd-profile-note">Restoranlar ro‘yxatini yuklashda xatolik.</p>
            )}
            {isRestaurantAdmin && !myRestaurantsLoading && !myRestaurantsError && myRestaurants.length === 0 && (
              <p className="fd-profile-note">Sizga hozircha restoran biriktirilmagan.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

