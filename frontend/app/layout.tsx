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
          BiteNow
        </Link>
        <nav className="fd-nav">
          <Link href="/" className="fd-nav-link">Главная</Link>
          <Link href="/restaurants" className="fd-nav-link">Рестораны</Link>
        </nav>
      </div>
      <Link href="/checkout" className="fd-cart">
        <span className="fd-cart-count">{count}</span>
        <span className="fd-cart-label">Корзина</span>
        <span className="fd-cart-total">{total.toFixed(0)} ₽</span>
      </Link>
    </header>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
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
