"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BackLink } from "../../../components/BackLink";
import { adminApi } from "../../../lib/adminApi";

const PERIOD_OPTIONS = [
  { value: 14, label: "So‘nggi 14 kun" },
  { value: 30, label: "So‘nggi 30 kun" },
  { value: 60, label: "So‘nggi 60 kun" },
  { value: 90, label: "So‘nggi 90 kun" },
];

export default function CourierStatsPage() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [byDay, setByDay] = useState<Array<{ date: string; count: number }>>([]);
  const [periodDays, setPeriodDays] = useState(30);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await adminApi.getCourierDeliveredByDay({ days });
      setTotal(data.total ?? 0);
      setByDay(Array.isArray(data.byDay) ? data.byDay : []);
      setPeriodDays(data.days ?? days);
    } catch (e: any) {
      const msg = String(e?.message ?? "Xatolik");
      setError(msg);
      const low = msg.toLowerCase();
      if (low.includes("unauthorized") || low.includes("missing authorization")) {
        router.push("/login?next=/courier/stats");
      }
      if (low.includes("forbidden") || low.includes("faqat kuryerlar")) {
        router.push("/profile");
      }
    } finally {
      setLoading(false);
    }
  }, [days, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem("token")) {
      router.push("/login?next=/courier/stats");
      return;
    }
    load();
  }, [load, router]);

  const maxCount = byDay.reduce((m, r) => Math.max(m, r.count), 0) || 1;

  return (
    <div className="fd-shell fd-section">
      <BackLink href="/courier" />
      <h1 className="fd-section-title">Statistika</h1>
      <p className="fd-card-desc" style={{ marginBottom: 16 }}>
        Yetkazilgan buyurtmalar soni kunlar bo‘yicha (Toshkent vaqti, UTC+5). Faqat siz tugatgan buyurtmalar.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <label className="fd-checkout-meta" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Davr
          <select
            className="fd-btn"
            style={{ padding: "8px 12px", cursor: "pointer" }}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            disabled={loading}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="fd-btn fd-btn-primary" onClick={() => load()} disabled={loading}>
          {loading ? "Yuklanmoqda…" : "Yangilash"}
        </button>
        <Link href="/courier" className="fd-btn" style={{ textDecoration: "none" }}>
          Buyurtmalar
        </Link>
      </div>
      {error && <p className="fd-empty">{error}</p>}
      {!loading && !error && (
        <div className="fd-card" style={{ padding: 16, marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>
            Jami: {total} ta (so‘nggi {periodDays} kun)
          </p>
        </div>
      )}
      {!loading && !error && byDay.length === 0 && (
        <p className="fd-empty">Tanlangan davrda yetkazilgan buyurtma yo‘q.</p>
      )}
      {!loading && !error && byDay.length > 0 && (
        <div className="fd-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border, #e8e8e8)", textAlign: "left" }}>
                <th style={{ padding: "12px 14px" }}>Sana</th>
                <th style={{ padding: "12px 14px", width: "90px" }}>Soni</th>
                <th style={{ padding: "12px 14px" }}>Ulush</th>
              </tr>
            </thead>
            <tbody>
              {byDay.map((row) => (
                <tr key={row.date} style={{ borderBottom: "1px solid var(--color-border, #e8e8e8)" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{row.date}</td>
                  <td style={{ padding: "10px 14px" }}>{row.count}</td>
                  <td style={{ padding: "8px 14px", verticalAlign: "middle" }}>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 4,
                        background: "var(--color-border, #e8e8e8)",
                        overflow: "hidden",
                        maxWidth: 220,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.round((row.count / maxCount) * 100)}%`,
                          background: "var(--color-primary, #0d6efd)",
                          minWidth: row.count > 0 ? 4 : 0,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
