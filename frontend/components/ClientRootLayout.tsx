"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CartProvider, useCart } from "./CartContext";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { PWAInstallModal } from "./PWAInstallModal";
import { DeferredMaterialIcons } from "./DeferredMaterialIcons";
import { api } from "../lib/api";

function Header() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/platform-admin")) {
    return (
      <header className="fd-header fd-header--admin">
        <span className="fd-logo" style={{ cursor: "default" }}>Admin paneli profili</span>
      </header>
    );
  }
  const showCity = !pathname.startsWith("/restaurant-admin") && !pathname.startsWith("/courier");
  return <HeaderMain showCity={showCity} />;
}

function HeaderMain({ showCity }: { showCity: boolean }) {
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
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <Link href="/" className="fd-logo">
            Minutka
          </Link>
          {showCity && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-secondary)",
                marginTop: 2,
              }}
            >
              Chust shahri bo'ylab
            </span>
          )}
        </div>
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
          <span className="fd-install-label">Ilovani yuklang</span>
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
      : pathname.startsWith("/search")
        ? "search"
        : pathname.startsWith("/checkout")
          ? "checkout"
          : pathname.startsWith("/profile") ||
              pathname.startsWith("/login") ||
              pathname.startsWith("/register")
            ? "profile"
            : null;

  return (
    <nav className="fd-bottom-bar fd-bottom-bar--icons-only" aria-label="Asosiy navigatsiya">
      <Link
        href="/"
        className={`fd-bottom-item ${activeKey === "home" ? "fd-bottom-item--active" : ""}`}
        aria-current={activeKey === "home" ? "page" : undefined}
        aria-label="Bosh sahifa"
      >
        <span className="fd-bottom-icon material-symbols-rounded" aria-hidden={true}>
          home
        </span>
        <span className="fd-bottom-label">Bosh sahifa</span>
      </Link>
      <Link
        href="/search"
        className={`fd-bottom-item ${activeKey === "search" ? "fd-bottom-item--active" : ""}`}
        aria-current={activeKey === "search" ? "page" : undefined}
        aria-label="Qidiruv"
      >
        <span className="fd-bottom-icon material-symbols-rounded" aria-hidden={true}>
          search
        </span>
        <span className="fd-bottom-label">Qidiruv</span>
      </Link>
      <Link
        href="/checkout"
        className={`fd-bottom-item ${activeKey === "checkout" ? "fd-bottom-item--active" : ""}`}
        aria-current={activeKey === "checkout" ? "page" : undefined}
        aria-label="Savat"
      >
        <span className="fd-bottom-icon-wrap">
          <span className="fd-bottom-icon material-symbols-rounded" aria-hidden={true}>
            shopping_bag
          </span>
          {cartCount > 0 && (
            <span className="fd-bottom-badge">{cartCount > 99 ? "99+" : cartCount}</span>
          )}
        </span>
        <span className="fd-bottom-label">Savat</span>
      </Link>
      <Link
        href="/profile"
        className={`fd-bottom-item ${activeKey === "profile" ? "fd-bottom-item--active" : ""}`}
        aria-current={activeKey === "profile" ? "page" : undefined}
        aria-label="Profil"
      >
        <span className="fd-bottom-icon material-symbols-rounded" aria-hidden={true}>
          person
        </span>
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
  if (pathname.startsWith("/courier")) return false;
  return true;
}

function VisitRecorder() {
  const pathname = usePathname() || "";
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      pathname.startsWith("/platform-admin") ||
      pathname.startsWith("/restaurant-admin") ||
      pathname.startsWith("/courier")
    )
      return;
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

export default function ClientRootLayout({ children }: { children: ReactNode }) {
  const showBottomBar = useShowBottomBar();
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingSw, setWaitingSw] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          try {
            sessionStorage.setItem("minutka_sw_registered", "1");
            sessionStorage.removeItem("minutka_sw_register_error");
          } catch {
            // ignore
          }
          // Update banner: show when a new SW is waiting
          const captureWaiting = () => {
            const w = reg.waiting;
            if (w) {
              setWaitingSw(w);
              setUpdateReady(true);
            }
          };
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                captureWaiting();
              }
            });
          });
          captureWaiting();

          const onControllerChange = () => {
            // new SW has taken control → reload to get fresh assets
            window.location.reload();
          };
          navigator.serviceWorker.addEventListener("controllerchange", onControllerChange, { once: true });

          if (!("PushManager" in window) || !("Notification" in window)) return;
          const key = "minutka_push_registered";
          if (sessionStorage.getItem(key)) return;
          if (Notification.permission === "denied") return;
          const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!publicKey) return;
          const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
          if (!apiBase) return;
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
            const token = window.localStorage.getItem("token");
            await fetch(`${apiBase.replace(/\/$/, "")}/push/subscribe`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(sub),
            }).catch(() => {});
            sessionStorage.setItem(key, "1");
          };
          ensureSubscription().catch(() => {});
        })
        .catch((e) => {
          try {
            sessionStorage.setItem(
              "minutka_sw_register_error",
              typeof e?.message === "string" ? e.message : String(e),
            );
          } catch {
            // ignore
          }
          // Keep console signal for debugging production issues
          // eslint-disable-next-line no-console
          console.warn("SW register failed", e);
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register as any);
  }, []);

  return (
    <>
      <DeferredMaterialIcons />
      <CartProvider>
        <VisitRecorder />
        <Header />
        {updateReady && (
          <div className="fd-update-banner" role="status" aria-live="polite">
            <div className="fd-update-banner__text">
              Yangi versiya mavjud. Yangilaysizmi?
            </div>
            <button
              type="button"
              className="fd-btn fd-btn-primary fd-update-banner__btn"
              onClick={() => {
                if (!waitingSw) return;
                waitingSw.postMessage({ type: "SKIP_WAITING" });
              }}
            >
              Yangilash
            </button>
            <button
              type="button"
              className="fd-btn fd-update-banner__btn"
              onClick={() => setUpdateReady(false)}
            >
              Keyin
            </button>
          </div>
        )}
        <main className={showBottomBar ? "fd-main" : "fd-main fd-main--no-bottom-bar"}>
          {children}
        </main>
        {showBottomBar && <BottomBar />}
        <PWAInstallGate />
      </CartProvider>
    </>
  );
}
