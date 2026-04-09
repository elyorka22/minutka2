"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrderTracking } from "./OrderTrackingContext";

const TERMINAL = new Set(["DONE", "CANCELLED"]);

const STATUS_LINE: Record<string, string> = {
  NEW: "Buyurtma yuborildi — restoran javobini kutmoqda",
  ACCEPTED: "Restoran buyurtmani qabul qildi",
  READY: "Buyurtma tayyor — kuryer tayinlanmoqda",
  ON_THE_WAY: "Kuryer buyurtmani yetkazmoqda",
};

export function OrderTrackingStrip() {
  const pathname = usePathname() || "";
  const { activeOrderId, status, shortCode } = useOrderTracking();

  if (
    pathname.startsWith("/platform-admin") ||
    pathname.startsWith("/restaurant-admin") ||
    pathname.startsWith("/courier")
  ) {
    return null;
  }

  if (!activeOrderId) {
    return null;
  }

  const up = status ? String(status).toUpperCase() : "";
  if (TERMINAL.has(up)) {
    return null;
  }

  const codeLabel =
    shortCode != null && Number.isFinite(Number(shortCode))
      ? String(shortCode).padStart(6, "0")
      : "—";

  const line =
    up && STATUS_LINE[up] ? STATUS_LINE[up] : "Buyurtma holati yangilanmoqda…";

  return (
    <div className="fd-order-track-strip" role="status" aria-live="polite">
      <div className="fd-order-track-strip__main">
        <span className="fd-order-track-strip__label">Faol buyurtma</span>
        <span className="fd-order-track-strip__code">#{codeLabel}</span>
        <span className="fd-order-track-strip__status">{line}</span>
      </div>
      <Link href="/checkout" className="fd-order-track-strip__link">
        Batafsil
      </Link>
    </div>
  );
}
