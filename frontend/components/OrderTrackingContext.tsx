"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { API_BASE, getOrCreateMinutkaClientKey } from "../lib/api";
import { getAccessToken } from "../lib/auth-tokens";

const STORAGE_KEY = "minutka_track_order_id";

const TERMINAL = new Set(["DONE", "CANCELLED"]);

const CANCEL_NOTICE_MS = 14_000;

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
  cancelledNotice: { shortCode: number } | null;
  setTrackingOrderId: (id: string | null) => void;
  dismissCancelledNotice: () => void;
};

const OrderTrackingContext = createContext<OrderTrackingContextValue | null>(null);

export function OrderTrackingProvider({ children }: { children: ReactNode }) {
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<number | null>(null);
  const [cancelledNotice, setCancelledNotice] = useState<{ shortCode: number } | null>(null);
  const cancelledTimerRef = useRef<number | null>(null);

  const dismissCancelledNotice = useCallback(() => {
    if (cancelledTimerRef.current != null) {
      window.clearTimeout(cancelledTimerRef.current);
      cancelledTimerRef.current = null;
    }
    setCancelledNotice(null);
  }, []);

  useEffect(() => {
    return () => {
      if (cancelledTimerRef.current != null) {
        window.clearTimeout(cancelledTimerRef.current);
      }
    };
  }, []);

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
        if (up === "DONE") {
          setTrackingOrderId(null);
          return;
        }
        if (up === "CANCELLED") {
          if (cancelledTimerRef.current != null) {
            window.clearTimeout(cancelledTimerRef.current);
          }
          setCancelledNotice({ shortCode: s.shortCode });
          setTrackingOrderId(null);
          cancelledTimerRef.current = window.setTimeout(() => {
            setCancelledNotice(null);
            cancelledTimerRef.current = null;
          }, CANCEL_NOTICE_MS);
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
      cancelledNotice,
      setTrackingOrderId,
      dismissCancelledNotice,
    }),
    [activeOrderId, status, shortCode, cancelledNotice, setTrackingOrderId, dismissCancelledNotice],
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
