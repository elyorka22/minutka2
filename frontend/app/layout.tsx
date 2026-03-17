"use client";

import "../globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CartProvider, useCart } from "../components/CartContext";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { PWAInstallModal } from "../components/PWAInstallModal";
import { api, API_BASE } from "../lib/api";

function Header() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/platform-admin")) {
    return (
      <header className="fd-header fd-header--admin">
        <span className="fd-logo" style={{ cursor: "default" }}>Admin paneli profili</span>
      </header>
    );
  }
  return <HeaderMain />;
}

function HeaderMain() {
  const [canInstall, setCanInstall] = useState(false);
  const [installEvent, setInstallEvent] = useState<any | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standaloneMq = window.matchMedia("(display-mode: standalone)");
    const computeStandalone = () =>
      standaloneMq.matches || (window.navigator as any).standalone === true;
    setIsStandalone(computeStandalone());

    const handler = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const onAppInstalled = () => {
      setIsStandalone(true);
      setCanInstall(false);
      setInstallEvent(null);
    };
    window.addEventListener("appinstalled", onAppInstalled);
    const onDisplayModeChange = () => setIsStandalone(computeStandalone());
    if (typeof (standaloneMq as any).addEventListener === "function") {
      (standaloneMq as any).addEventListener("change", onDisplayModeChange);
    } else {
      // Safari fallback
      (standaloneMq as any).addListener?.(onDisplayModeChange);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onAppInstalled);
      if (typeof (standaloneMq as any).removeEventListener === "function") {
        (standaloneMq as any).removeEventListener("change", onDisplayModeChange);
      } else {
        (standaloneMq as any).removeListener?.(onDisplayModeChange);
      }
    };
  }, []);

  async function handleInstallClick() {
    if (isStandalone) {
      // Ilova allaqachon o‘rnatilgan — foydalanuvchi allaqachon ilovada.
      return;
    }
    if (installEvent) {
      installEvent.prompt?.();
      await installEvent.userChoice?.();
      setCanInstall(false);
      setInstallEvent(null);
      return;
    }

    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        alert(
          "iOS qurilmasida ilovani o‘rnatish uchun brauzer menyusidan “Add to Home Screen” ni tanlang."
        );
      } else {
        alert(
          "Brauzer menyusidan saytni asosiy ekranga qo‘shish funksiyasi orqali ilovani o‘rnatishingiz mumkin."
        );
      }
    }
  }

  return (
    <header className="fd-header">
      <div className="fd-header-left">
        <Link href="/" className="fd-logo">
          Minutka
        </Link>
        <nav className="fd-nav">
          <Link href="/" className="fd-nav-link">Bosh sahifa</Link>
          <Link href="/restaurants" className="fd-nav-link">Restoranlar</Link>
        </nav>
      </div>
      {!isStandalone && (
        <button
          type="button"
          className="fd-install-btn"
          onClick={handleInstallClick}
          aria-label={canInstall ? "Ilovani o‘rnatish" : "Ilovani o‘rnatish bo‘yicha ko‘rsatma"}
        >
          <span className="fd-install-icon material-symbols-rounded">
            download
          </span>
          <span className="fd-install-label">Telefonimga o‘rnatish</span>
        </button>
      )}
    </header>
  );
}

function BottomBar() {
  const pathname = usePathname() || "/";
  const { items } = useCart();

  const cartCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const activeKey =
    pathname === "/"
      ? "home"
      : pathname.startsWith("/restaurants")
        ? "restaurants"
        : pathname.startsWith("/supermarkets")
          ? "supermarkets"
        : pathname.startsWith("/checkout")
          ? "checkout"
          : pathname.startsWith("/profile") ||
              pathname.startsWith("/login") ||
              pathname.startsWith("/register")
            ? "profile"
            : null;

  return (
    <nav className="fd-bottom-bar">
      <Link
        href="/"
        className={`fd-bottom-item ${activeKey === "home" ? "fd-bottom-item--active" : ""}`}
        aria-current={activeKey === "home" ? "page" : undefined}
      >
        <span className="fd-bottom-icon material-symbols-rounded">home</span>
        <span className="fd-bottom-label">Bosh sahifa</span>
      </Link>
      <Link
        href="/restaurants"
        className={`fd-bottom-item ${activeKey === "restaurants" ? "fd-bottom-item--active" : ""}`}
        aria-current={activeKey === "restaurants" ? "page" : undefined}
      >
        <span className="fd-bottom-icon material-symbols-rounded">restaurant</span>
        <span className="fd-bottom-label">Restoranlar</span>
      </Link>
      <Link
        href="/supermarkets"
        className={`fd-bottom-item ${activeKey === "supermarkets" ? "fd-bottom-item--active" : ""}`}
        aria-current={activeKey === "supermarkets" ? "page" : undefined}
      >
        <span className="fd-bottom-icon material-symbols-rounded">store</span>
        <span className="fd-bottom-label">Do‘konlar</span>
      </Link>
      <Link
        href="/checkout"
        className={`fd-bottom-item ${activeKey === "checkout" ? "fd-bottom-item--active" : ""}`}
        aria-current={activeKey === "checkout" ? "page" : undefined}
      >
        <span className="fd-bottom-icon material-symbols-rounded">shopping_bag</span>
        <span className="fd-bottom-label">Savat</span>
        {cartCount > 0 && (
          <span className="fd-bottom-badge">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </Link>
      <Link
        href="/profile"
        className={`fd-bottom-item fd-bottom-item--ghost ${activeKey === "profile" ? "fd-bottom-item--active" : ""}`}
        aria-current={activeKey === "profile" ? "page" : undefined}
      >
        <span className="fd-bottom-icon material-symbols-rounded">person</span>
        <span className="fd-bottom-label">Profil</span>
      </Link>
    </nav>
  );
}

function useShowBottomBar() {
  const pathname = usePathname();
  if (!pathname) return true;
  if (pathname.startsWith("/platform-admin")) return false;
  if (pathname.startsWith("/restaurant-admin")) return false;
  return true;
}

function VisitRecorder() {
  const pathname = usePathname() || "";
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/platform-admin") || pathname.startsWith("/restaurant-admin")) return;
    const key = "minutka_visit_sent";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    api.recordVisit();
  }, [pathname]);
  return null;
}

function PWAInstallGate() {
  const { shouldShowModal, handleInstall, handleLater } = usePWAInstall();
  return (
    <PWAInstallModal
      open={shouldShowModal}
      onInstall={handleInstall}
      onLater={handleLater}
    />
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const showBottomBar = useShowBottomBar();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (!("PushManager" in window) || !("Notification" in window)) return;
          const key = "minutka_push_registered";
          if (sessionStorage.getItem(key)) return;
          if (Notification.permission === "denied") return;
          const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!publicKey) return;
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
          const ensureSubscription = async () => {
            let permission = Notification.permission;
            if (permission === "default") {
              permission = await Notification.requestPermission();
            }
            if (permission !== "granted") return;
            const existing = await reg.pushManager.getSubscription();
            if (existing) return;
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
            await fetch(`${API_BASE.replace(/\/$/, "")}/push/subscribe`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(sub),
            }).catch(() => {});
            sessionStorage.setItem(key, "1");
          };
          ensureSubscription().catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  return (
    <html lang="uz">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ff6b00" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <title>Minutka — Restoranlar va ovqat yetkazib berish xizmati</title>
        <meta
          name="description"
          content="Minutka orqali shahringizdagi restoranlar va do‘konlardan tez buyurtma qiling. Eng yaxshi aksiyalar va qulay yetkazib berish xizmati."
        />
        <meta
          property="og:title"
          content="Minutka — Restoranlar va ovqat yetkazib berish xizmati"
        />
        <meta
          property="og:description"
          content="Restoranlar va do‘konlardan tez buyurtma qiling. Eng yaxshi aksiyalar Minutka’da."
        />
        <meta
          property="og:image"
          content="https://minut-ka.uz/web-app-manifest-512x512.png"
        />
        <meta property="og:url" content="https://minut-ka.uz" />
        <meta property="og:type" content="website" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="fd-body">
        <CartProvider>
          <VisitRecorder />
          <Header />
          <main className={showBottomBar ? "fd-main" : "fd-main fd-main--no-bottom-bar"}>
            {children}
          </main>
          {showBottomBar && <BottomBar />}
          <PWAInstallGate />
        </CartProvider>
      </body>
    </html>
  );
}
