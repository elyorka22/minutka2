"use client";

import "../globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CartProvider } from "../components/CartContext";

function Header() {
  const [canInstall, setCanInstall] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstallClick() {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setCanInstall(false);
    setInstallEvent(null);
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
      {canInstall && (
        <button
          type="button"
          className="fd-install-btn"
          onClick={handleInstallClick}
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
  return (
    <nav className="fd-bottom-bar">
      <Link href="/" className="fd-bottom-item fd-bottom-item--active">
        <span className="fd-bottom-icon material-symbols-rounded">home</span>
        <span className="fd-bottom-label">Bosh sahifa</span>
      </Link>
      <Link href="/restaurants" className="fd-bottom-item">
        <span className="fd-bottom-icon material-symbols-rounded">restaurant</span>
        <span className="fd-bottom-label">Restoranlar</span>
      </Link>
      <Link href="/checkout" className="fd-bottom-item">
        <span className="fd-bottom-icon material-symbols-rounded">shopping_bag</span>
        <span className="fd-bottom-label">Savat</span>
      </Link>
      <Link href="/profile" className="fd-bottom-item fd-bottom-item--ghost">
        <span className="fd-bottom-icon material-symbols-rounded">person</span>
        <span className="fd-bottom-label">Profil</span>
      </Link>
    </nav>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {});
    }
  }, []);

  return (
    <html lang="uz">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ea580c" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="fd-body">
        <CartProvider>
          <Header />
          <main className="fd-main">{children}</main>
          <BottomBar />
        </CartProvider>
      </body>
    </html>
  );
}
