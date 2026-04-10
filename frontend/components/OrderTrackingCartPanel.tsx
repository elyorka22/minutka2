"use client";

import { useOrderTracking } from "./OrderTrackingContext";

const STATUS_LINE: Record<string, string> = {
  NEW: "Buyurtma yuborildi — restoran javobini kutmoqda",
  ACCEPTED: "Restoran buyurtmani qabul qildi",
  READY: "Buyurtma tayyor — kuryer tayinlanmoqda",
  ON_THE_WAY: "Kuryer buyurtmani yetkazmoqda",
};

export function OrderTrackingCartPanel() {
  const { activeOrderId, status, shortCode, cancelledNotice, dismissCancelledNotice } =
    useOrderTracking();

  if (cancelledNotice) {
    const code = String(cancelledNotice.shortCode).padStart(6, "0");
    return (
      <div
        className="fd-checkout-order-track fd-checkout-order-track--cancelled"
        role="alert"
        aria-live="assertive"
      >
        <div className="fd-checkout-order-track__title">Buyurtma bekor qilindi</div>
        <p className="fd-checkout-order-track__text">
          Restoran buyurtma #{code}ni bekor qildi. Agar savolingiz bo‘lsa, qo‘llab-quvvatlash bilan
          bog‘laning.
        </p>
        <button type="button" className="fd-btn fd-btn-secondary fd-checkout-order-track__dismiss" onClick={dismissCancelledNotice}>
          Yopish
        </button>
      </div>
    );
  }

  if (!activeOrderId) {
    return null;
  }

  const up = status ? String(status).toUpperCase() : "";
  const codeLabel =
    shortCode != null && Number.isFinite(Number(shortCode))
      ? String(shortCode).padStart(6, "0")
      : "—";

  const line =
    up && STATUS_LINE[up] ? STATUS_LINE[up] : "Buyurtma holati yangilanmoqda…";

  return (
    <div className="fd-checkout-order-track" role="status" aria-live="polite">
      <div className="fd-checkout-order-track__label">Faol buyurtma</div>
      <div className="fd-checkout-order-track__code">#{codeLabel}</div>
      <div className="fd-checkout-order-track__status">{line}</div>
    </div>
  );
}
