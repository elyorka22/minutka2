"use client";

import { useEffect } from "react";

type PWAInstallModalProps = {
  open: boolean;
  onInstall: () => void;
  onLater: () => void;
};

export function PWAInstallModal({ open, onInstall, onLater }: PWAInstallModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fd-pwa-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fd-pwa-title"
      onClick={(e) => e.target === e.currentTarget && onLater()}
    >
      <div className="fd-pwa-modal">
        <div className="fd-pwa-icon" aria-hidden>
          <span className="material-symbols-rounded">restaurant</span>
        </div>
        <h2 id="fd-pwa-title" className="fd-pwa-title">
          Установите приложение Minutka
        </h2>
        <p className="fd-pwa-text">
          Заказывайте еду быстрее и удобнее. Получайте уведомления об акциях и скидках.
        </p>
        <div className="fd-pwa-actions">
          <button
            type="button"
            className="fd-pwa-btn fd-pwa-btn--primary"
            onClick={onInstall}
          >
            Установить
          </button>
          <button
            type="button"
            className="fd-pwa-btn fd-pwa-btn--secondary"
            onClick={onLater}
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
