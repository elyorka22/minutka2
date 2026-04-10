"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminApi } from "../../../lib/adminApi";

type TabId = "orders" | "archive" | "stats" | "telegram";

/** Manzil matnida «Tel: …» takrorlanmasin — alohida «Telefon» qatori ko‘rsatiladi. */
function stripTelSegmentsFromDetails(details: string | null | undefined): string {
  if (typeof details !== "string" || !details.trim()) return "";
  return details
    .split(/[·\n\r]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^tel\s*:/i.test(p))
    .join(" · ");
}

function displayCustomerPhone(order: {
  customer?: { phone?: string | null };
  address?: { details?: string | null };
}): string {
  const p = order.customer?.phone?.trim();
  if (p) return p;
  const raw = order.address?.details?.trim() ?? "";
  if (!raw) return "";
  const m = raw.match(/(?:^|[·\n\r])\s*Tel:\s*([^·\n\r]+)/i);
  if (m) return m[1].trim();
  const m2 = raw.match(/^\s*Tel:\s*([^·\n\r]+)/i);
  return m2 ? m2[1].trim() : "";
}

function OrderCard({
  o,
  onStatusChange,
  onArchive,
  showStatusButtons = true,
}: {
  o: any;
  onStatusChange?: (id: string, status: string, cancelReason?: string) => void;
  onArchive?: (order: any) => void;
  showStatusButtons?: boolean;
}) {
  const [addressOpen, setAddressOpen] = useState(false);
  const displayCode = o?.shortCode != null ? String(o.shortCode).padStart(6, "0") : String(o.id).slice(0, 6);
  const addr = o.address;
  const addrDetailsWithoutTel = addr ? stripTelSegmentsFromDetails(addr.details) : "";
  const hasCoords =
    addr &&
    (addr.latitude != null || addr.longitude != null) &&
    (Number(addr.latitude) !== 0 || Number(addr.longitude) !== 0);
  const mapUrl = hasCoords
    ? `https://www.google.com/maps?q=${Number(addr.latitude)},${Number(addr.longitude)}`
    : addr?.street
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [addr.street, addr.city].filter(Boolean).join(", "),
        )}`
      : null;
  return (
    <div key={o.id} className="fd-card" style={{ padding: 16, marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <strong>#{displayCode}</strong>
          <span style={{ marginLeft: 8, fontSize: "0.875rem", color: "var(--color-muted)" }}>{o.status}</span>
        </div>
        {showStatusButtons && onStatusChange && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            {o.status === "NEW" && (
              <button
                className="fd-btn fd-btn-primary"
                type="button"
                style={{ fontSize: "0.82rem", padding: "6px 10px", lineHeight: 1.2 }}
                onClick={() => onStatusChange(o.id, "ACCEPTED")}
              >
                Qabul qilish
              </button>
            )}
            {o.status === "ACCEPTED" && (
              <button
                className="fd-btn fd-btn-primary"
                type="button"
                style={{ fontSize: "0.82rem", padding: "6px 10px", lineHeight: 1.2 }}
                onClick={() => onStatusChange(o.id, "READY")}
              >
                Tayyor
              </button>
            )}

            {o.status === "READY" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "0.82rem",
                  padding: "6px 10px",
                  lineHeight: 1.2,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                  fontWeight: 600,
                  flexShrink: 0,
                  maxWidth: "100%",
                }}
              >
                Kuryer kutyapti
              </span>
            )}
            {o.status === "ON_THE_WAY" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "0.82rem",
                  padding: "6px 10px",
                  lineHeight: 1.2,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                  fontWeight: 600,
                  flexShrink: 0,
                  maxWidth: "100%",
                }}
              >
                Yo‘lda
              </span>
            )}

            {o.status !== "CANCELLED" && o.status !== "DONE" && (
              <button
                className="fd-btn fd-btn--secondary"
                type="button"
                style={{ fontSize: "0.82rem", padding: "6px 10px", lineHeight: 1.2 }}
                onClick={() => {
                  const reason = prompt("Bekor qilish sababi?");
                  if (!reason) return;
                  onStatusChange(o.id, "CANCELLED", reason);
                }}
              >
                Bekor qilish
              </button>
            )}
            {onArchive && (
              <button
                className="fd-btn"
                type="button"
                style={{ fontSize: "0.82rem", padding: "6px 10px", lineHeight: 1.2 }}
                onClick={() => onArchive(o)}
              >
                Arxivga
              </button>
            )}
          </div>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="fd-card-desc" style={{ fontWeight: 600, marginBottom: 6 }}>
          Buyurtma (taomlar):
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.9rem" }}>
          {(o.items ?? []).map((oi: any, idx: number) => {
            const desc =
              typeof oi.dish?.description === "string" ? oi.dish.description.trim() : "";
            return (
              <li key={oi.id ?? idx} style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 600 }}>
                  {oi.dish?.name ?? "—"} × {oi.quantity} ={" "}
                  {(Number(oi.price) * oi.quantity).toLocaleString()} so&apos;m
                </div>
                {desc ? (
                  <div className="fd-card-desc" style={{ marginTop: 2, fontSize: "0.85rem" }}>
                    {desc}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div style={{ marginTop: 8, fontSize: "0.875rem", color: "var(--color-muted)" }}>
          <div style={{ fontWeight: 600 }}>
            Taomlar jami: {Number(o.subtotal ?? 0).toLocaleString()} so&apos;m
          </div>
          <div style={{ marginTop: 4 }}>
            Platforma ulushi: {Number(o.serviceFee ?? 0).toLocaleString()} so&apos;m
          </div>
        </div>
      </div>
      {(() => {
        const tel = displayCustomerPhone(o);
        if (!tel) return null;
        const digits = tel.replace(/\s/g, "");
        const href = `tel:${digits}`;
        return (
          <div style={{ marginTop: 12, fontSize: "0.9rem" }}>
            <span style={{ fontWeight: 600 }}>Telefon: </span>
            <a href={href} style={{ color: "var(--color-orange)" }}>
              {tel}
            </a>
          </div>
        );
      })()}
      {addr && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="fd-btn fd-btn--secondary"
            onClick={() => setAddressOpen((v) => !v)}
            style={{ fontSize: "0.82rem", padding: "6px 10px", lineHeight: 1.2 }}
            aria-expanded={addressOpen}
          >
            {addressOpen ? "Manzilni yashirish" : "Manzil"}
          </button>
          {addressOpen && (
            <div style={{ marginTop: 10 }}>
              <div className="fd-card-desc" style={{ fontWeight: 600, marginBottom: 4 }}>
                Manzil:
              </div>
              <p className="fd-card-desc" style={{ margin: 0 }}>
                {addr.street}
                {addr.city ? `, ${addr.city}` : ""}
                {addrDetailsWithoutTel ? ` · ${addrDetailsWithoutTel}` : ""}
              </p>
              {o.comment && (
                <p className="fd-card-desc" style={{ margin: "4px 0 0 0" }}>
                  Izoh: {o.comment}
                </p>
              )}
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fd-btn"
                  style={{
                    marginTop: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    textDecoration: "none",
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                    location_on
                  </span>
                  Xaritada ko&apos;rish
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RestaurantAdminPage({
  params,
}: { params: { restaurantId: string } }) {
  const restaurantId = params.restaurantId;
  const [activeTab, setActiveTab] = useState<TabId>("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [archive, setArchive] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    activeOrdersCount: number;
    deliveredOrdersCount: number;
    totalRevenue: number;
    platformFeePercent: number;
    totalPlatformFee: number;
  } | null>(null);
  const [debtInfo, setDebtInfo] = useState<{ amount: number; percent: number } | null>(null);
  /** Per-tab loading avoids races (e.g. stats finishing and clearing loading while orders are still fetching). */
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualArchive, setManualArchive] = useState<any[]>([]);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramChatIds, setTelegramChatIds] = useState<string[]>([]);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const manualArchiveKey = `restaurant-admin-manual-archive:${restaurantId}`;
  const soundEnabledKey = `restaurant-admin-sound-enabled:${restaurantId}`;

  function parseChatIds(raw: string): string[] {
    return raw
      .split(/[,;\n\r\s]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function uniq(arr: string[]): string[] {
    return Array.from(new Set(arr));
  }

  /**
   * Cursor for GET .../orders/changes?since= — only advance from a successful full list fetch.
   * Never set this from /changes meta before loadOrders finishes: if the DB has a new row but
   * the list response is still empty (queue lag), advancing the cursor makes the next poll return changed=false.
   */
  const ordersLastSyncAtRef = useRef<string | null>(null);
  /** First successful load should not ring — only truly new orders after that. */
  const ordersInitializedRef = useRef(false);
  /** Keeps IDs of NEW orders already seen by this page session. */
  const seenNewOrderIdsRef = useRef<Set<string>>(new Set());
  /** Lazily created browser audio context for short notification beep. */
  const audioCtxRef = useRef<AudioContext | null>(null);
  /** Mirrors manualArchive for use inside fetch callbacks (always current). */
  const manualArchiveRef = useRef<any[]>([]);

  function ensureAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }

  function playNewOrderSound() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") {
        void ctx.resume().catch(() => {});
      }
      if (ctx.state !== "running") return;
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(980, now);
      osc1.connect(gain);
      gain.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc1.start(now);
      osc1.stop(now + 0.21);

      const secondStart = now + 0.24;
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1320, secondStart);
      osc2.connect(gain);
      gain.gain.setValueAtTime(0.0001, secondStart);
      gain.gain.exponentialRampToValueAtTime(0.25, secondStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, secondStart + 0.19);
      osc2.start(secondStart);
      osc2.stop(secondStart + 0.2);
    } catch {
      // ignore audio errors (browser policy/device)
    }
  }

  useEffect(() => {
    manualArchiveRef.current = manualArchive;
  }, [manualArchive]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(manualArchiveKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setManualArchive(Array.isArray(parsed) ? parsed : []);
    } catch {
      setManualArchive([]);
    }
  }, [manualArchiveKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(soundEnabledKey);
      if (raw == null) {
        setSoundEnabled(true);
        return;
      }
      setSoundEnabled(raw !== "0");
    } catch {
      setSoundEnabled(true);
    }
  }, [soundEnabledKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(soundEnabledKey, soundEnabled ? "1" : "0");
    } catch {
      // ignore storage issues
    }
  }, [soundEnabled, soundEnabledKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const unlock = () => {
      const ctx = ensureAudioContext();
      if (!ctx) return;
      void ctx
        .resume()
        .then(() => {})
        .catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(manualArchiveKey, JSON.stringify(manualArchive));
    } catch {
      // ignore storage issues
    }
  }, [manualArchive, manualArchiveKey]);

  const loadOrders = useCallback((opts?: { background?: boolean }) => {
    const background = !!opts?.background;
    if (!background) setOrdersLoading(true);
    setError(null);
    adminApi
      .getRestaurantOrders(restaurantId, { limit: 50, offset: 0 })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const serverIds = new Set(
          list.map((o: any) => o?.id).filter((id: unknown): id is string => typeof id === "string" && id.length > 0),
        );
        const prev = manualArchiveRef.current;
        const pruned =
          list.length === 0 ? prev : prev.filter((x: any) => serverIds.has(x?.id));
        const prevIds = prev
          .map((x: any) => x?.id)
          .filter((id: unknown): id is string => typeof id === "string")
          .join("|");
        const prunedIds = pruned
          .map((x: any) => x?.id)
          .filter((id: unknown): id is string => typeof id === "string")
          .join("|");
        if (prevIds !== prunedIds) setManualArchive(pruned);
        const hiddenIds = new Set(
          pruned.map((x: any) => x?.id).filter((id: unknown): id is string => typeof id === "string" && id.length > 0),
        );
        const visibleOrders = list.filter((o: any) => !hiddenIds.has(o.id));
        setOrders(visibleOrders);

        const currentNewIds = new Set(
          visibleOrders
            .filter((o: any) => String(o?.status ?? "") === "NEW")
            .map((o: any) => String(o?.id ?? ""))
            .filter((id: string) => id.length > 0),
        );
        if (!ordersInitializedRef.current) {
          seenNewOrderIdsRef.current = currentNewIds;
          ordersInitializedRef.current = true;
        } else {
          let hasBrandNewOrder = false;
          for (const id of currentNewIds) {
            if (!seenNewOrderIdsRef.current.has(id)) {
              hasBrandNewOrder = true;
              break;
            }
          }
          if (hasBrandNewOrder && soundEnabled) playNewOrderSound();
          seenNewOrderIdsRef.current = currentNewIds;
        }

        const latest = list
          .map((o: any) => String(o?.updatedAt ?? o?.createdAt ?? ""))
          .filter(Boolean)
          .sort()
          .pop();
        if (latest) ordersLastSyncAtRef.current = latest;
        else ordersLastSyncAtRef.current = null;
      })
      .catch((err: any) => setError(err?.message ?? "Xatolik"))
      .finally(() => {
        if (!background) setOrdersLoading(false);
      });
  }, [restaurantId, soundEnabled]);

  function loadArchive() {
    setArchiveLoading(true);
    setError(null);
    adminApi
      .getRestaurantOrdersArchive(restaurantId)
      .then((data) => setArchive(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err?.message ?? "Xatolik"))
      .finally(() => setArchiveLoading(false));
  }

  function loadStats() {
    setStatsLoading(true);
    setError(null);
    adminApi
      .getRestaurantStats(restaurantId)
      .then((s) => {
        setStats(s);
        setDebtInfo({
          amount: Number(s?.totalPlatformFee ?? 0),
          percent: Number(s?.platformFeePercent ?? 0),
        });
      })
      .catch((err: any) => setError(err?.message ?? "Xatolik"))
      .finally(() => setStatsLoading(false));
  }

  useEffect(() => {
    adminApi
      .getRestaurantStats(restaurantId)
      .then((s) =>
        setDebtInfo({
          amount: Number(s?.totalPlatformFee ?? 0),
          percent: Number(s?.platformFeePercent ?? 0),
        }),
      )
      .catch(() => setDebtInfo(null));
  }, [restaurantId]);

  useEffect(() => {
    adminApi
      .getRestaurantSettings(restaurantId)
      .then((s) => {
        const raw = String(s?.telegramChatId ?? "");
        setTelegramChatIds(parseChatIds(raw));
        // Input — только для добавления новых ID
        setTelegramChatId("");
      })
      .catch(() => {
        setTelegramChatIds([]);
        setTelegramChatId("");
      });
  }, [restaurantId]);

  useEffect(() => {
    if (activeTab === "orders") loadOrders();
    else if (activeTab === "archive") loadArchive();
    else if (activeTab === "stats") loadStats();
  }, [restaurantId, activeTab, manualArchive, loadOrders]);

  useEffect(() => {
    if (activeTab !== "orders") return;
    let inFlight = false;
    let safetyTick = 0;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (inFlight) return;
      inFlight = true;
      adminApi
        .getRestaurantOrdersChanges(restaurantId, { since: ordersLastSyncAtRef.current ?? undefined })
        .then((meta) => {
          if (meta?.changed) loadOrders({ background: true });
        })
        .finally(() => {
          inFlight = false;
        });
    };
    const interval = setInterval(() => {
      tick();
      safetyTick += 1;
      if (safetyTick >= 12) {
        safetyTick = 0;
        loadOrders({ background: true });
      }
    }, 2500);
    const onVisible = () => {
      if (typeof document === "undefined" || document.hidden) return;
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        resumeTimer = null;
        if (typeof document !== "undefined" && document.hidden) return;
        tick();
      }, 280);
    };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      if (resumeTimer) clearTimeout(resumeTimer);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeTab, restaurantId, loadOrders]);

  async function changeStatus(id: string, status: string, cancelReason?: string) {
    try {
      await adminApi.updateOrderStatus(id, status as any, cancelReason);
      setOrders((prev) =>
        status === "CANCELLED" ? prev.filter((o) => o.id !== id) : prev.map((o) => (o.id === id ? { ...o, status } : o)),
      );
    } catch (err) {
      console.error(err);
    }
  }

  function archiveOrder(order: any) {
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    setManualArchive((prev) => {
      if (prev.some((x: any) => x?.id === order.id)) return prev;
      return [{ ...order, _manualArchived: true }, ...prev];
    });
  }

  async function saveTelegramSettings() {
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const inputRaw = telegramChatId.trim();
      const toAdd = parseChatIds(inputRaw);
      if (toAdd.length === 0) {
        setSettingsMessage("Telegram chat ID kiriting (yoki vergul/enter orqali bir nechta kiriting).");
        return;
      }

      const nextIds = uniq([...telegramChatIds, ...toAdd]);
      const saved = await adminApi.updateRestaurantSettings(restaurantId, {
        telegramChatId: nextIds.join(","),
      });

      setTelegramChatIds(parseChatIds(String(saved?.telegramChatId ?? "")));
      setTelegramChatId("");
      setSettingsMessage("Qo‘shildi.");
    } catch (err: any) {
      setSettingsMessage(err?.message ?? "Sozlamani saqlashda xatolik.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function deleteTelegramChatId(id: string) {
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const nextIds = telegramChatIds.filter((x) => x !== id);
      await adminApi.updateRestaurantSettings(restaurantId, {
        telegramChatId: nextIds.join(","),
      });
      setTelegramChatIds(nextIds);
      setSettingsMessage("O‘chirildi.");
    } catch (err: any) {
      setSettingsMessage(err?.message ?? "O‘chirishda xatolik.");
    } finally {
      setSettingsSaving(false);
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "orders", label: "Buyurtmalar" },
    { id: "archive", label: "Arxiv" },
    { id: "stats", label: "Statistika" },
    { id: "telegram", label: "Telegram" },
  ];
  const mergedArchive = [...manualArchive, ...archive.filter((o) => !manualArchive.some((m: any) => m?.id === o?.id))];

  return (
    <div className="fd-shell fd-section" style={{ marginTop: 10 }}>
      <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <Link href="/profile" className="fd-btn" style={{ textDecoration: "none" }}>
          Profilga qaytish
        </Link>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            className={soundEnabled ? "fd-btn fd-btn-primary" : "fd-btn"}
            onClick={() => setSoundEnabled((v) => !v)}
            title="Yangi buyurtma ovozli bildirishnomasi"
          >
            {soundEnabled ? "🔔 Ovoz: yoqilgan" : "🔕 Ovoz: o‘chirilgan"}
          </button>
          <button type="button" className="fd-btn" disabled style={{ cursor: "default" }}>
            {debtInfo
              ? `Platforma qarzi: ${debtInfo.amount.toLocaleString()} so'm (${debtInfo.percent}%)`
              : "Platforma qarzi: —"}
          </button>
        </div>
      </div>
      <h1 className="fd-section-title">Restoran boshqaruvi</h1>

      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === activeTab ? "fd-btn fd-btn-primary" : "fd-btn"}
            onClick={() => setActiveTab(t.id)}
            style={{ padding: "8px 12px", fontSize: "0.85rem", flexShrink: 0 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {((activeTab === "orders" && ordersLoading && orders.length === 0) ||
        (activeTab === "archive" && archiveLoading) ||
        (activeTab === "stats" && statsLoading && stats == null)) && <p>Yuklanmoqda...</p>}
      {error && (
        <div className="fd-empty">
          <p>{error}</p>
          {(error.includes("tayinlangan") || error.includes("restoran") || error.includes("do'kon")) && (
            <p style={{ marginTop: 12 }}>
              <Link href="/profile" className="fd-btn fd-btn-primary" style={{ textDecoration: "none" }}>
                Profilga o‘tish
              </Link>
            </p>
          )}
        </div>
      )}

      {activeTab === "telegram" && (
        <div className="fd-card" style={{ padding: 16, marginBottom: 14 }}>
          <div className="fd-card-desc" style={{ fontWeight: 700, marginBottom: 10 }}>
            Telegram bot sozlamalari
          </div>
          <p className="fd-card-desc" style={{ marginTop: 0 }}>
            Botda yangi buyurtma: qisqa xabar, «Qabul qilish» — to‘liq ma’lumot va xarita, keyin «Tayyor» — kuryerlarga.
            Holatni shu yerda ham boshqarishingiz mumkin (qabul/tayyor).
            Chat ID kiriting; bir nechtasini vergul yoki yangi
            qator bilan qo‘shishingiz mumkin.
          </p>

          <label className="fd-label" htmlFor="telegram-chat-id" style={{ marginBottom: 6, display: "block" }}>
            Telegram chat ID (yoki bir nechta)
          </label>
          <input
            id="telegram-chat-id"
            className="fd-input"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder="-1001234567890, -1009876543210"
          />

          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="fd-btn fd-btn-primary"
              onClick={saveTelegramSettings}
              disabled={settingsSaving}
            >
              {settingsSaving ? "Saqlanmoqda..." : "Qo‘shish"}
            </button>
            {settingsMessage && <span className="fd-checkout-meta">{settingsMessage}</span>}
          </div>

          {telegramChatIds.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="fd-card-desc" style={{ fontWeight: 700, marginBottom: 10 }}>
                Saqlangan chat ID
              </div>
              {telegramChatIds.map((id) => (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      padding: "6px 10px",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      background: "var(--color-surface)",
                    }}
                  >
                    {id}
                  </span>
                  <button
                    type="button"
                    className="fd-btn fd-btn--secondary"
                    style={{ fontSize: "0.82rem", padding: "6px 10px" }}
                    onClick={() => deleteTelegramChatId(id)}
                    disabled={settingsSaving}
                  >
                    O‘chirish
                  </button>
                </div>
              ))}
            </div>
          )}

          {telegramChatIds.length === 0 && !settingsSaving && (
            <p className="fd-empty" style={{ marginTop: 14 }}>
              Hali hech qanday chat ID saqlanmadi.
            </p>
          )}
        </div>
      )}

      {activeTab === "orders" && (
        <div className="fd-admin-orders">
          {manualArchive.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="fd-btn fd-btn--secondary"
                style={{ fontSize: "0.82rem" }}
                onClick={() => {
                  setManualArchive([]);
                  manualArchiveRef.current = [];
                  loadOrders();
                }}
              >
                Yashirilganlarni qayta ko&apos;rish ({manualArchive.length})
              </button>
            </div>
          )}
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              o={o}
              onStatusChange={changeStatus}
              onArchive={archiveOrder}
              showStatusButtons
            />
          ))}
          {orders.length === 0 && !ordersLoading && !error && (
            <p className="fd-empty">Aktiv buyurtmalar yo‘q.</p>
          )}
        </div>
      )}

      {activeTab === "archive" && !archiveLoading && (
        <div className="fd-admin-orders">
          <p className="fd-checkout-meta" style={{ marginBottom: 12 }}>
            Yetkazilgan va bekor qilingan buyurtmalar (oxirgi 3 kun). 3 kundan keyin avtomatik o‘chiriladi.
          </p>
          {mergedArchive.map((o) => (
            <OrderCard key={o.id} o={o} showStatusButtons={false} />
          ))}
          {mergedArchive.length === 0 && !error && <p className="fd-empty">Arxiv bo‘sh.</p>}
        </div>
      )}

      {activeTab === "stats" && !statsLoading && stats != null && (
        <div className="fd-card" style={{ padding: 16 }}>
          <p className="fd-card-desc">
            <strong>Aktiv buyurtmalar:</strong> {stats.activeOrdersCount}
          </p>
          <p className="fd-card-desc">
            <strong>Yetkazilgan buyurtmalar:</strong> {stats.deliveredOrdersCount}
          </p>
          <p className="fd-card-desc">
            <strong>Jami daromad (yetkazilgan):</strong> {Number(stats.totalRevenue).toLocaleString()} so&apos;m
          </p>
          <p className="fd-card-desc">
            <strong>Platforma ulushi:</strong> {stats.platformFeePercent}%
          </p>
          <p className="fd-card-desc">
            <strong>Platformaga to‘langan:</strong> {Number(stats.totalPlatformFee).toLocaleString()} so&apos;m
          </p>
        </div>
      )}
    </div>
  );
}
