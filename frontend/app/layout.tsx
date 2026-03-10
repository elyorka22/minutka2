"use client";

import "../globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { CartProvider, useCart } from "../components/CartContext";

function Header() {
  const { items, total } = useCart();
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="fd-header">
      <div className="fd-header-left">
        <Link href="/" className="fd-logo">
          минутку
        </Link>
        <nav className="fd-nav">
          <Link href="/" className="fd-nav-link">Bosh sahifa</Link>
          <Link href="/restaurants" className="fd-nav-link">Restoranlar</Link>
        </nav>
      </div>
      <Link href="/checkout" className="fd-cart">
        <span className="fd-cart-count">{count}</span>
        <span className="fd-cart-label">Savat</span>
        <span className="fd-cart-total">{total.toFixed(0)} so&apos;m</span>
      </Link>
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
  return (
    <html lang="uz">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        />
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
