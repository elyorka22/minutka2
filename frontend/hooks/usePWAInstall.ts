"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pwa-install-dismissed";
const DELAY_MS = 20_000;

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" }>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function getWasDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {}
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (nav.standalone === true) ||
    document.referrer.includes("android-app://") === true
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }
    if (getWasDismissed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => {
      setShowModal(true);
    }, DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    } finally {
      setDeferredPrompt(null);
      setShowModal(false);
    }
  }, [deferredPrompt]);

  const handleLater = useCallback(() => {
    setDismissed();
    setShowModal(false);
  }, []);

  const shouldShowModal = showModal && !!deferredPrompt && !isInstalled;

  return {
    shouldShowModal,
    handleInstall,
    handleLater,
    canInstall: !!deferredPrompt,
    isInstalled,
  };
}
