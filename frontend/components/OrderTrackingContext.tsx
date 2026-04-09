"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { API_BASE, getOrCreateMinutkaClientKey } from "../lib/api";
import { getAccessToken } from "../lib/auth-tokens";

const STORAGE_KEY = "minutka_track_order_id";

const TERMINAL = new Set(["DONE", "CANCELLED"]);

async function fetchTrackStatus(orderId: string): Promise<{ status: string; shortCode: number }> {
  const token = getAccessToken();
  const clientKey = getOrCreateMinutkaClientKey();
  const qs = clientKey ? `?clientKey=${encodeURIComponent(clientKey)}` : "";
  const res = await fetch(
    `${API_BASE.replace(/\/$/, "")}/orders/track/${encodeURIComponent(orderId)}/status${qs}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(String(res.status));
  }
  return (await res.json()) as { status: string; shortCode: number };
}

type OrderTrackingContextValue = {
  activeOrderId: string | null;
  status: string | null;
  shortCode: number | null;
  setTrackingOrderId: (id: string | null) => void;
};

const OrderTrackingContext = createContext<OrderTrackingContextValue | null>(null);

export function OrderTrackingProvider({ children }: { children: ReactNode }) {
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && raw.length > 8) {
        setActiveOrderIdState(raw);
      }
    } catch {
      // ignore
    }
  }, []);

  const setTrackingOrderId = useCallback((id: string | null) => {
    setActiveOrderIdState(id);
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!activeOrderId) {
      setStatus(null);
      setShortCode(null);
      return;
    }

    let alive = true;
    let timerId: number | undefined;

    const scheduleNext = () => {
      timerId = window.setTimeout(tick, 4000);
    };

    const tick = async () => {
      if (!alive) return;
      try {
        const s = await fetchTrackStatus(activeOrderId);
        if (!alive) return;
        setStatus(s.status);
        setShortCode(s.shortCode);
        const up = String(s.status).toUpperCase();
        if (TERMINAL.has(up)) {
          setTrackingOrderId(null);
          return;
        }
      } catch {
        if (!alive) return;
      }
      if (alive) scheduleNext();
    };

    void tick();

    return () => {
      alive = false;
      if (typeof timerId === "number") {
        window.clearTimeout(timerId);
      }
    };
  }, [activeOrderId, setTrackingOrderId]);

  const value = useMemo<OrderTrackingContextValue>(
    () => ({
      activeOrderId,
      status,
      shortCode,
      setTrackingOrderId,
    }),
    [activeOrderId, status, shortCode, setTrackingOrderId],
  );

  return <OrderTrackingContext.Provider value={value}>{children}</OrderTrackingContext.Provider>;
}

export function useOrderTracking(): OrderTrackingContextValue {
  const ctx = useContext(OrderTrackingContext);
  if (!ctx) {
    throw new Error("useOrderTracking must be used within OrderTrackingProvider");
  }
  return ctx;
}
