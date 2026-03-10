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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="fd-body">
        <CartProvider>
          <Header />
          <main className="fd-main">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
