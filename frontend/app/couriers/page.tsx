"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BackLink } from "../../components/BackLink";

type Courier = {
  id: string;
  name: string;
  phoneMasked: string;
  rating: number;
  status: "IDLE" | "ON_DELIVERY" | "OFFLINE";
  vehicle: "Scooter" | "Car" | "Bike";
};

const demoCouriers: Courier[] = [
  { id: "c-1", name: "Aziz", phoneMasked: "+998 90 *** ** 12", rating: 4.9, status: "IDLE", vehicle: "Scooter" },
  { id: "c-2", name: "Malika", phoneMasked: "+998 99 *** ** 40", rating: 4.8, status: "ON_DELIVERY", vehicle: "Car" },
  { id: "c-3", name: "Jasur", phoneMasked: "+998 93 *** ** 07", rating: 4.7, status: "OFFLINE", vehicle: "Bike" },
  { id: "c-4", name: "Sardor", phoneMasked: "+998 97 *** ** 88", rating: 4.6, status: "IDLE", vehicle: "Scooter" },
];

function statusLabel(s: Courier["status"]) {
  if (s === "IDLE") return "Bo‘sh";
  if (s === "ON_DELIVERY") return "Yetkazishda";
  return "Offline";
}

export default function CouriersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | Courier["status"]>("ALL");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return demoCouriers.filter((c) => {
      if (status !== "ALL" && c.status !== status) return false;
      if (!query) return true;
      return c.name.toLowerCase().includes(query);
    });
  }, [q, status]);

  return (
    <div className="fd-shell">
      <section className="fd-section">
        <BackLink href="/" />
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 className="fd-section-title">Kuryerlar</h1>
        </div>
        <p className="fd-empty" style={{ marginTop: 8 }}>
          Bu sahifa demo. Keyingi bosqichda kuryerlar real tizimdan keladi va buyurtmaga biriktiriladi.
        </p>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <input
            className="fd-home-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kuryer izlash..."
          />

          <div className="fd-home-chips" style={{ marginTop: 0 }}>
            <button type="button" className={`fd-chip ${status === "ALL" ? "fd-chip--active" : ""}`} onClick={() => setStatus("ALL")}>
              Barchasi
            </button>
            <button type="button" className={`fd-chip ${status === "IDLE" ? "fd-chip--active" : ""}`} onClick={() => setStatus("IDLE")}>
              Bo‘sh
            </button>
            <button type="button" className={`fd-chip ${status === "ON_DELIVERY" ? "fd-chip--active" : ""}`} onClick={() => setStatus("ON_DELIVERY")}>
              Yetkazishda
            </button>
            <button type="button" className={`fd-chip ${status === "OFFLINE" ? "fd-chip--active" : ""}`} onClick={() => setStatus("OFFLINE")}>
              Offline
            </button>
          </div>
        </div>

        <div className="fd-platform-grid" style={{ marginTop: 16 }}>
          {filtered.map((c) => (
            <div key={c.id} className="fd-admin-kpi" style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <span className="fd-badge">★ {c.rating.toFixed(1)}</span>
              </div>
              <div className="fd-checkout-meta">{c.phoneMasked}</div>
              <div className="fd-checkout-meta">
                Status: {statusLabel(c.status)} · Transport: {c.vehicle}
              </div>
              <button type="button" className="fd-btn fd-btn-primary" style={{ justifySelf: "start" }}>
                Ko‘rish
              </button>
            </div>
          ))}
          {filtered.length === 0 && <p className="fd-empty">Hech narsa topilmadi.</p>}
        </div>
      </section>
    </div>
  );
}

