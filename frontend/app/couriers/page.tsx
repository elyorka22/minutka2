"use client";

import { BackLink } from "../../components/BackLink";

export default function CouriersPage() {
  return (
    <div className="fd-shell">
      <section className="fd-section">
        <BackLink href="/" />
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 className="fd-section-title">Kuryerlar</h1>
        </div>
        <p className="fd-empty" style={{ marginTop: 8 }}>
          Kuryerlar bilan to‘liq ishlash (ro‘yxat, statuslar, yuklama) platforma admin panelida amalga
          oshiriladi. Bu sahifa foydalanuvchilar uchun maʼlumot xarakteriga ega.
        </p>
      </section>
    </div>
  );
}

